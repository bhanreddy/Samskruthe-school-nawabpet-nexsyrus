package com.schoolims.biometrics

import android.os.Build
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyPermanentlyInvalidatedException
import android.security.keystore.KeyInfo
import android.security.keystore.KeyProperties
import android.util.Base64
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import java.security.KeyFactory
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.PrivateKey
import java.security.Signature
import java.security.spec.ECGenParameterSpec

class StaffBiometricsModule : Module() {
  private val KEYSTORE_PROVIDER = "AndroidKeyStore"
  private val ATTENDANCE_KEY_PREFIX = "schoolims_att_v2_"
  private val SESSION_KEY_PREFIX = "schoolims_dev_v2_"

  override fun definition() = ModuleDefinition {
    Name("StaffBiometricsModule")

    AsyncFunction("checkBiometricCapability") { promise: Promise ->
      val context = appContext.reactContext ?: run {
        promise.resolve(mapOf("isAvailable" to false, "reason" to "NO_CONTEXT"))
        return@AsyncFunction
      }

      val biometricManager = BiometricManager.from(context)
      val canAuth = biometricManager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG)

      when (canAuth) {
        BiometricManager.BIOMETRIC_SUCCESS -> {
          promise.resolve(mapOf(
            "isAvailable" to true,
            "hasStrongBiometrics" to true,
            "enrolled" to true,
            "reason" to null
          ))
        }
        BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED -> {
          promise.resolve(mapOf(
            "isAvailable" to false,
            "hasStrongBiometrics" to true,
            "enrolled" to false,
            "reason" to "NOT_ENROLLED"
          ))
        }
        BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE -> {
          promise.resolve(mapOf(
            "isAvailable" to false,
            "hasStrongBiometrics" to false,
            "enrolled" to false,
            "reason" to "NO_HARDWARE"
          ))
        }
        BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE -> {
          promise.resolve(mapOf(
            "isAvailable" to false,
            "hasStrongBiometrics" to false,
            "enrolled" to false,
            "reason" to "HARDWARE_UNAVAILABLE"
          ))
        }
        BiometricManager.BIOMETRIC_ERROR_SECURITY_UPDATE_REQUIRED -> {
          promise.resolve(mapOf(
            "isAvailable" to false,
            "hasStrongBiometrics" to false,
            "enrolled" to false,
            "reason" to "SECURITY_UPDATE_REQUIRED"
          ))
        }
        else -> {
          promise.resolve(mapOf(
            "isAvailable" to false,
            "hasStrongBiometrics" to false,
            "enrolled" to false,
            "reason" to "WEAK_OR_UNSUPPORTED"
          ))
        }
      }
    }

    AsyncFunction("generateAttendanceKey") { alias: String, promise: Promise ->
      try {
        val fullAlias = ATTENDANCE_KEY_PREFIX + alias
        val keyStore = KeyStore.getInstance(KEYSTORE_PROVIDER)
        keyStore.load(null)

        if (keyStore.containsAlias(fullAlias)) {
          keyStore.deleteEntry(fullAlias)
        }

        val keyPairGenerator = KeyPairGenerator.getInstance(
          KeyProperties.KEY_ALGORITHM_EC,
          KEYSTORE_PROVIDER
        )

        val builder = KeyGenParameterSpec.Builder(
          fullAlias,
          KeyProperties.PURPOSE_SIGN
        )
          .setAlgorithmParameterSpec(ECGenParameterSpec("secp256r1"))
          .setDigests(KeyProperties.DIGEST_SHA256)
          .setUserAuthenticationRequired(true)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
          builder.setUserAuthenticationParameters(0, KeyProperties.AUTH_BIOMETRIC_STRONG)
        } else {
          @Suppress("DEPRECATION")
          builder.setUserAuthenticationValidityDurationSeconds(-1)
        }

        builder.setInvalidatedByBiometricEnrollment(true)

        keyPairGenerator.initialize(builder.build())
        val keyPair = keyPairGenerator.generateKeyPair()
        val keyInfo = KeyFactory.getInstance(KeyProperties.KEY_ALGORITHM_EC, KEYSTORE_PROVIDER)
          .getKeySpec(keyPair.private, KeyInfo::class.java)
        @Suppress("DEPRECATION")
        val hardwareBacked = keyInfo.isInsideSecureHardware
        if (!hardwareBacked) {
          keyStore.deleteEntry(fullAlias)
          promise.reject("HARDWARE_KEYSTORE_REQUIRED", "Secure hardware is required for staff attendance keys", null)
          return@AsyncFunction
        }
        val publicKeyBytes = keyPair.public.encoded
        val publicKeyPem = formatAsPem(publicKeyBytes, "PUBLIC KEY")
        promise.resolve(mapOf(
          "success" to true,
          "publicKey" to publicKeyPem,
          "keyAlias" to fullAlias
        ))
      } catch (e: Exception) {
        promise.reject("KEY_GENERATION_FAILED", e.message, e)
      }
    }

    AsyncFunction("generateDeviceSessionKey") { alias: String, promise: Promise ->
      try {
        val fullAlias = SESSION_KEY_PREFIX + alias
        val keyStore = KeyStore.getInstance(KEYSTORE_PROVIDER)
        keyStore.load(null)

        if (keyStore.containsAlias(fullAlias)) {
          keyStore.deleteEntry(fullAlias)
        }

        val keyPairGenerator = KeyPairGenerator.getInstance(
          KeyProperties.KEY_ALGORITHM_EC,
          KEYSTORE_PROVIDER
        )

        val builder = KeyGenParameterSpec.Builder(
          fullAlias,
          KeyProperties.PURPOSE_SIGN
        )
          .setAlgorithmParameterSpec(ECGenParameterSpec("secp256r1"))
          .setDigests(KeyProperties.DIGEST_SHA256)

        keyPairGenerator.initialize(builder.build())
        val keyPair = keyPairGenerator.generateKeyPair()
        val keyInfo = KeyFactory.getInstance(KeyProperties.KEY_ALGORITHM_EC, KEYSTORE_PROVIDER)
          .getKeySpec(keyPair.private, KeyInfo::class.java)
        @Suppress("DEPRECATION")
        val hardwareBacked = keyInfo.isInsideSecureHardware
        if (!hardwareBacked) {
          keyStore.deleteEntry(fullAlias)
          promise.reject("HARDWARE_KEYSTORE_REQUIRED", "Secure hardware is required for staff attendance keys", null)
          return@AsyncFunction
        }
        val publicKeyBytes = keyPair.public.encoded
        val publicKeyPem = formatAsPem(publicKeyBytes, "PUBLIC KEY")

        promise.resolve(mapOf(
          "success" to true,
          "publicKey" to publicKeyPem,
          "keyAlias" to fullAlias
        ))
      } catch (e: Exception) {
        promise.reject("SESSION_KEY_GENERATION_FAILED", e.message, e)
      }
    }

    AsyncFunction("signWithBiometric") { alias: String, canonicalPayload: String, promptTitle: String, promptSubtitle: String, promise: Promise ->
      val activity = appContext.currentActivity as? FragmentActivity
      if (activity == null) {
        promise.reject("NO_ACTIVITY", "Current activity is not available", null)
        return@AsyncFunction
      }

      try {
        val fullAlias = ATTENDANCE_KEY_PREFIX + alias
        val keyStore = KeyStore.getInstance(KEYSTORE_PROVIDER)
        keyStore.load(null)

        if (!keyStore.containsAlias(fullAlias)) {
          promise.reject("KEY_NOT_FOUND", "Attendance key was not found. Device registration required.", null)
          return@AsyncFunction
        }

        val privateKey = keyStore.getKey(fullAlias, null) as? PrivateKey
        if (privateKey == null) {
          promise.reject("INVALID_KEY", "Private key is null", null)
          return@AsyncFunction
        }

        val signature = Signature.getInstance("SHA256withECDSA")
        try {
          signature.initSign(privateKey)
        } catch (e: KeyPermanentlyInvalidatedException) {
          promise.reject("KEY_PERMANENTLY_INVALIDATED", "Biometric enrollment changed on this device. Re-registration required.", e)
          return@AsyncFunction
        }

        val cryptoObject = BiometricPrompt.CryptoObject(signature)
        val executor = ContextCompat.getMainExecutor(activity)

        activity.runOnUiThread {
          val biometricPrompt = BiometricPrompt(
            activity,
            executor,
            object : BiometricPrompt.AuthenticationCallback() {
              override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                super.onAuthenticationSucceeded(result)
                try {
                  val authenticatedSignature = result.cryptoObject?.signature
                    ?: run {
                      promise.reject("CRYPTO_ERROR", "Signature object missing from biometric result", null)
                      return
                    }

                  authenticatedSignature.update(canonicalPayload.toByteArray(Charsets.UTF_8))
                  val signatureBytes = authenticatedSignature.sign()
                  val base64Signature = Base64.encodeToString(signatureBytes, Base64.NO_WRAP)

                  promise.resolve(mapOf(
                    "success" to true,
                    "signature" to base64Signature
                  ))
                } catch (signErr: Exception) {
                  promise.reject("SIGNING_FAILED", signErr.message, signErr)
                }
              }

              override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                super.onAuthenticationError(errorCode, errString)
                when (errorCode) {
                  BiometricPrompt.ERROR_CANCELED,
                  BiometricPrompt.ERROR_USER_CANCELED,
                  BiometricPrompt.ERROR_NEGATIVE_BUTTON -> {
                    promise.reject("USER_CANCELED", "Biometric authentication was cancelled by the user", null)
                  }
                  BiometricPrompt.ERROR_LOCKOUT,
                  BiometricPrompt.ERROR_LOCKOUT_PERMANENT -> {
                    promise.reject("LOCKOUT", "Too many failed attempts. Biometric sensor locked.", null)
                  }
                  else -> {
                    promise.reject("BIOMETRIC_ERROR", errString.toString(), null)
                  }
                }
              }

              override fun onAuthenticationFailed() {
                super.onAuthenticationFailed()
                // Handled natively by BiometricPrompt UI showing "Not recognized, try again"
              }
            }
          )

          val promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle(promptTitle)
            .setSubtitle(promptSubtitle)
            .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG)
            .setNegativeButtonText("Cancel")
            .build()

          biometricPrompt.authenticate(promptInfo, cryptoObject)
        }
      } catch (e: Exception) {
        if (e is KeyPermanentlyInvalidatedException) {
          promise.reject("KEY_PERMANENTLY_INVALIDATED", "Biometric enrollment changed on this device. Re-registration required.", e)
        } else {
          promise.reject("SIGN_PREPARATION_FAILED", e.message, e)
        }
      }
    }

    AsyncFunction("signWithDeviceSessionKey") { alias: String, payload: String, promise: Promise ->
      try {
        val fullAlias = SESSION_KEY_PREFIX + alias
        val keyStore = KeyStore.getInstance(KEYSTORE_PROVIDER)
        keyStore.load(null)

        val privateKey = keyStore.getKey(fullAlias, null) as? PrivateKey
          ?: run {
            promise.reject("KEY_NOT_FOUND", "Device session key not found", null)
            return@AsyncFunction
          }

        val signature = Signature.getInstance("SHA256withECDSA")
        signature.initSign(privateKey)
        signature.update(payload.toByteArray(Charsets.UTF_8))
        val signatureBytes = signature.sign()
        val base64Signature = Base64.encodeToString(signatureBytes, Base64.NO_WRAP)

        promise.resolve(mapOf(
          "success" to true,
          "signature" to base64Signature
        ))
      } catch (e: Exception) {
        promise.reject("SESSION_SIGN_FAILED", e.message, e)
      }
    }

    AsyncFunction("deleteKeys") { alias: String, promise: Promise ->
      try {
        val keyStore = KeyStore.getInstance(KEYSTORE_PROVIDER)
        keyStore.load(null)
        val attAlias = ATTENDANCE_KEY_PREFIX + alias
        val devAlias = SESSION_KEY_PREFIX + alias
        if (keyStore.containsAlias(attAlias)) keyStore.deleteEntry(attAlias)
        if (keyStore.containsAlias(devAlias)) keyStore.deleteEntry(devAlias)
        promise.resolve(true)
      } catch (e: Exception) {
        promise.reject("DELETE_FAILED", e.message, e)
      }
    }
  }

  private fun formatAsPem(bytes: ByteArray, type: String): String {
    val base64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
    val chunks = base64.chunked(64).joinToString("\n")
    return "-----BEGIN $type-----\n$chunks\n-----END $type-----"
  }
}
