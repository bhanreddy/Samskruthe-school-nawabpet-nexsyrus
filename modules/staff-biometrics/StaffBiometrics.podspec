Pod::Spec.new do |s|
  s.name           = 'StaffBiometrics'
  s.version        = '1.0.0'
  s.summary        = 'SchoolIMS biometric-gated attendance signing module'
  s.description    = 'Creates protected P-256 keys and signs staff attendance requests with system biometrics.'
  s.license        = { :type => 'Proprietary' }
  s.author         = 'SchoolIMS'
  s.homepage       = 'https://schoolims.local'
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  s.source         = { :path => '.' }
  s.static_framework = true
  s.source_files   = 'ios/**/*.{h,m,mm,swift}'
  s.dependency 'ExpoModulesCore'
end
