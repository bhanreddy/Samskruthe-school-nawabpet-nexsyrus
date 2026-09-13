import ExpoModulesCore
import LocalAuthentication
import Security

public class StaffBiometricsModule: Module {
  private let attendanceKeyPrefix = "schoolims_att_v2_"
  private let sessionKeyPrefix = "schoolims_dev_v2_"

  public func definition() -> ModuleDefinition {
    Name("StaffBiometricsModule")

    AsyncFunction("checkBiometricCapability") { (promise: Promise) in
      let context = LAContext()
      var error: NSError?
      let canEvaluate = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)

      if canEvaluate {
        let biometryType: String
        if #available(iOS 11.0, *) {
          switch context.biometryType {
          case .faceID:
            biometryType = "FACE_ID"
          case .touchID:
            biometryType = "TOUCH_ID"
          default:
            biometryType = "NONE"
          }
        } else {
          biometryType = "TOUCH_ID"
        }

        promise.resolve([
          "isAvailable": true,
          "hasStrongBiometrics": true,
          "enrolled": true,
          "biometryType": biometryType,
          "reason": NSNull()
        ])
      } else {
        let reason: String
        if let err = error {
          switch err.code {
          case LAError.biometryNotEnrolled.rawValue:
            reason = "NOT_ENROLLED"
          case LAError.biometryNotAvailable.rawValue:
            reason = "NO_HARDWARE"
          case LAError.biometryLockout.rawValue:
            reason = "LOCKOUT"
          default:
            reason = "WEAK_OR_UNSUPPORTED"
          }
        } else {
          reason = "UNKNOWN"
        }

        promise.resolve([
          "isAvailable": false,
          "hasStrongBiometrics": false,
          "enrolled": false,
          "reason": reason
        ])
      }
    }

    AsyncFunction("generateAttendanceKey") { (alias: String, promise: Promise) in
      let tag = (self.attendanceKeyPrefix + alias).data(using: .utf8)!

      // Delete existing key if present
      let deleteQuery: [String: Any] = [
        kSecClass as String: kSecClassKey,
        kSecAttrApplicationTag as String: tag,
        kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom
      ]
      SecItemDelete(deleteQuery as CFDictionary)

      var error: Unmanaged<CFError>?
      guard let access = SecAccessControlCreateWithFlags(
        kCFAllocatorDefault,
        kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly,
        [.biometryCurrentSet, .privateKeyUsage],
        &error
      ) else {
        promise.reject("ACCESS_CONTROL_FAILED", error?.takeRetainedValue().localizedDescription ?? "Access control creation failed")
        return
      }

      let attributes: [String: Any] = [
        kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
        kSecAttrKeySizeInBits as String: 256,
        kSecAttrTokenID as String: kSecAttrTokenIDSecureEnclave,
        kSecPrivateKeyAttrs as String: [
          kSecAttrIsPermanent as String: true,
          kSecAttrApplicationTag as String: tag,
          kSecAttrAccessControl as String: access
        ]
      ]

      guard let privateKey = SecKeyCreateRandomKey(attributes as CFDictionary, &error) else {
        promise.reject("KEY_GENERATION_FAILED", error?.takeRetainedValue().localizedDescription ?? "Key generation failed")
        return
      }

      guard let publicKey = SecKeyCopyPublicKey(privateKey) else {
        promise.reject("PUBLIC_KEY_FAILED", "Failed to extract public key")
        return
      }

      guard let publicKeyData = SecKeyCopyExternalRepresentation(publicKey, &error) as Data? else {
        promise.reject("EXPORT_FAILED", error?.takeRetainedValue().localizedDescription ?? "Failed to export public key representation")
        return
      }

      let pem = self.formatPublicKeyAsSpkiPem(x963Bytes: publicKeyData)
      promise.resolve([
        "success": true,
        "publicKey": pem,
        "keyAlias": self.attendanceKeyPrefix + alias
      ])
    }

    AsyncFunction("generateDeviceSessionKey") { (alias: String, promise: Promise) in
      let tag = (self.sessionKeyPrefix + alias).data(using: .utf8)!

      let deleteQuery: [String: Any] = [
        kSecClass as String: kSecClassKey,
        kSecAttrApplicationTag as String: tag,
        kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom
      ]
      SecItemDelete(deleteQuery as CFDictionary)

      var error: Unmanaged<CFError>?
      guard let access = SecAccessControlCreateWithFlags(
        kCFAllocatorDefault,
        kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
        [.privateKeyUsage],
        &error
      ) else {
        promise.reject("ACCESS_CONTROL_FAILED", error?.takeRetainedValue().localizedDescription ?? "Access control failed")
        return
      }

      let attributes: [String: Any] = [
        kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
        kSecAttrKeySizeInBits as String: 256,
        kSecAttrTokenID as String: kSecAttrTokenIDSecureEnclave,
        kSecPrivateKeyAttrs as String: [
          kSecAttrIsPermanent as String: true,
          kSecAttrApplicationTag as String: tag,
          kSecAttrAccessControl as String: access
        ]
      ]

      guard let privateKey = SecKeyCreateRandomKey(attributes as CFDictionary, &error) else {
        promise.reject("KEY_GENERATION_FAILED", error?.takeRetainedValue().localizedDescription ?? "Session key generation failed")
        return
      }

      guard let publicKey = SecKeyCopyPublicKey(privateKey),
            let publicKeyData = SecKeyCopyExternalRepresentation(publicKey, &error) as Data? else {
        promise.reject("PUBLIC_KEY_FAILED", "Failed to extract session public key")
        return
      }

      let pem = self.formatPublicKeyAsSpkiPem(x963Bytes: publicKeyData)
      promise.resolve([
        "success": true,
        "publicKey": pem,
        "keyAlias": self.sessionKeyPrefix + alias
      ])
    }

    AsyncFunction("signWithBiometric") { (alias: String, canonicalPayload: String, promptTitle: String, promptSubtitle: String, promise: Promise) in
      let tag = (self.attendanceKeyPrefix + alias).data(using: .utf8)!
      let context = LAContext()
      context.localizedFallbackTitle = "" // Suppress device passcode fallback
      context.touchIDAuthenticationAllowableReuseDuration = 0
      defer { context.invalidate() }

      let query: [String: Any] = [
        kSecClass as String: kSecClassKey,
        kSecAttrApplicationTag as String: tag,
        kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
        kSecReturnRef as String: true,
        kSecUseAuthenticationContext as String: context,
        kSecUseOperationPrompt as String: "\(promptTitle) — \(promptSubtitle)"
      ]

      var item: CFTypeRef?
      let status = SecItemCopyMatching(query as CFDictionary, &item)
      guard status == errSecSuccess, let privateKey = item as! SecKey? else {
        self.rejectBiometricError(NSError(domain: NSOSStatusErrorDomain, code: Int(status)), promise: promise)
        return
      }

      guard let dataToSign = canonicalPayload.data(using: .utf8) else {
        promise.reject("PAYLOAD_ENCODING_FAILED", "Could not encode payload")
        return
      }

      var error: Unmanaged<CFError>?
      guard let signature = SecKeyCreateSignature(
        privateKey,
        .ecdsaSignatureMessageX962SHA256,
        dataToSign as CFData,
        &error
      ) as Data? else {
        let signingError = error?.takeRetainedValue()
        self.rejectBiometricError(signingError.map { $0 as Error as NSError }, promise: promise)
        return
      }

      promise.resolve([
        "success": true,
        "signature": signature.base64EncodedString()
      ])
    }

    AsyncFunction("signWithDeviceSessionKey") { (alias: String, payload: String, promise: Promise) in
      let tag = (self.sessionKeyPrefix + alias).data(using: .utf8)!

      let query: [String: Any] = [
        kSecClass as String: kSecClassKey,
        kSecAttrApplicationTag as String: tag,
        kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
        kSecReturnRef as String: true
      ]

      var item: CFTypeRef?
      let status = SecItemCopyMatching(query as CFDictionary, &item)
      guard status == errSecSuccess, let privateKey = item as! SecKey? else {
        promise.reject("KEY_NOT_FOUND", "Session key not found")
        return
      }

      guard let dataToSign = payload.data(using: .utf8) else {
        promise.reject("PAYLOAD_ENCODING_FAILED", "Could not encode payload")
        return
      }

      var error: Unmanaged<CFError>?
      guard let signature = SecKeyCreateSignature(
        privateKey,
        .ecdsaSignatureMessageX962SHA256,
        dataToSign as CFData,
        &error
      ) as Data? else {
        promise.reject("SIGNING_FAILED", error?.takeRetainedValue().localizedDescription ?? "Signing failed")
        return
      }

      promise.resolve([
        "success": true,
        "signature": signature.base64EncodedString()
      ])
    }

    AsyncFunction("deleteKeys") { (alias: String, promise: Promise) in
      let attTag = (self.attendanceKeyPrefix + alias).data(using: .utf8)!
      let devTag = (self.sessionKeyPrefix + alias).data(using: .utf8)!

      let q1: [String: Any] = [kSecClass as String: kSecClassKey, kSecAttrApplicationTag as String: attTag]
      let q2: [String: Any] = [kSecClass as String: kSecClassKey, kSecAttrApplicationTag as String: devTag]
      SecItemDelete(q1 as CFDictionary)
      SecItemDelete(q2 as CFDictionary)

      promise.resolve(true)
    }
  }

  // Security can wrap LocalAuthentication errors. Use stable codes, never
  // localized text: cancellation/lockout must not invalidate a working key.
  private func rejectBiometricError(_ error: NSError?, promise: Promise) {
    var current = error
    for _ in 0..<8 {
      guard let value = current else { break }
      if value.domain == NSOSStatusErrorDomain {
        if value.code == Int(errSecUserCanceled) {
          promise.reject("USER_CANCELED", "Biometric authentication was cancelled")
          return
        }
        if value.code == Int(errSecItemNotFound) {
          promise.reject("KEY_PERMANENTLY_INVALIDATED", "Attendance key is unavailable. Re-registration required.")
          return
        }
      }
      if value.domain == LAError.errorDomain {
        switch value.code {
        case LAError.userCancel.rawValue, LAError.appCancel.rawValue, LAError.systemCancel.rawValue:
          promise.reject("USER_CANCELED", "Biometric authentication was cancelled")
          return
        case LAError.biometryLockout.rawValue:
          promise.reject("LOCKOUT", "Biometric sensor is locked. Try again after unlocking the phone.")
          return
        default: break
        }
      }
      current = value.userInfo[NSUnderlyingErrorKey] as? NSError
    }
    promise.reject("BIOMETRIC_ERROR", error?.localizedDescription ?? "Biometric signing failed")
  }

  private func formatAsPem(bytes: Data, type: String) -> String {
    let base64 = bytes.base64EncodedString()
    var result = "-----BEGIN \(type)-----\n"
    var index = base64.startIndex
    while index < base64.endIndex {
      let nextIndex = base64.index(index, offsetBy: 64, limitedBy: base64.endIndex) ?? base64.endIndex
      result += String(base64[index..<nextIndex]) + "\n"
      index = nextIndex
    }
    result += "-----END \(type)-----"
    return result
  }

  /// SecKey exports a P-256 public key as the 65-byte ANSI X9.63 point.
  /// Node's crypto verifier expects SubjectPublicKeyInfo for a PUBLIC KEY PEM,
  /// so prepend the DER algorithm identifiers for ecPublicKey/prime256v1.
  private func formatPublicKeyAsSpkiPem(x963Bytes: Data) -> String {
    let p256SpkiPrefix: [UInt8] = [
      0x30, 0x59, 0x30, 0x13, 0x06, 0x07, 0x2A, 0x86,
      0x48, 0xCE, 0x3D, 0x02, 0x01, 0x06, 0x08, 0x2A,
      0x86, 0x48, 0xCE, 0x3D, 0x03, 0x01, 0x07, 0x03,
      0x42, 0x00
    ]
    var spki = Data(p256SpkiPrefix)
    spki.append(x963Bytes)
    return formatAsPem(bytes: spki, type: "PUBLIC KEY")
  }
}
