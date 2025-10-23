'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getCookie, verifyToken, COOKIE_NAMES } from '@/lib/auth';

export default function LoginPage() {
  const [userid, setUserid] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isCheckingToken, setIsCheckingToken] = useState(true);
  const { login, isLoading } = useAuth();
  const router = useRouter();

  // Check for existing valid token on page load
  useEffect(() => {
    const checkExistingToken = async () => {
      try {
        const accessToken = getCookie(COOKIE_NAMES.ACCESS_TOKEN);
        const jwtToken = getCookie(COOKIE_NAMES.JWT_TOKEN);
        console.log('Access token found:', !!accessToken);
        console.log('JWT token found:', !!jwtToken);
        
        if (accessToken && jwtToken) {
          // For now, assume token is valid if both tokens exist
          console.log('Both tokens found, redirecting to applications');
          router.push('/applications');
          return;
        } else {
          console.log('Missing tokens, showing login form');
        }
      } catch (error) {
        console.error('Token check error:', error);
      } finally {
        setIsCheckingToken(false);
      }
    };

    checkExistingToken();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      console.log('Attempting login with userid:', userid);
      const success = await login(userid, password);
      console.log('Login success:', success);
      if (success) {
        console.log('Login successful, redirecting to applications');
        // Use window.location for a full page redirect to avoid router issues
        window.location.href = '/applications';
      } else {
        console.log('Login failed');
        setError('Invalid user ID or password');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Login failed. Please try again.');
    }
  };

  // Show loading state while checking token
  if (isCheckingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Blue Gradient Background */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-blue-900/20"></div>
        <div className="absolute top-20 left-20 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 right-20 w-48 h-48 bg-white/5 rounded-full blur-2xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
        
        {/* Content on left side - Empty for clean gradient background */}
        <div className="relative z-10 flex flex-col justify-center items-center text-white p-12">
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white relative">
        {/* Grid background pattern for right side */}
        <div className="absolute inset-0 opacity-5">
          <div className="grid-pattern"></div>
        </div>
        
        <div className="w-full max-w-md relative z-10">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-2">
              <svg width="150" height="50" viewBox="0 0 153 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.6616 6.01866L6.00958 22.6705C6.90371 23.9896 8.03687 25.1227 9.34707 25.9903L25.9725 9.3649C25.1049 8.04584 23.9718 6.91268 22.6527 6.02741L22.6616 6.01866Z" fill="#58E5A1" />
                <path d="M16.0043 4.00021C9.37365 4.00021 4 9.37375 4 16.0044C4 16.6064 4.04429 17.1995 4.13281 17.775L17.7749 4.13303C17.1994 4.0445 16.5975 4.00021 16.0043 4.00021Z" fill="white" />
                <path d="M27.8672 14.2426L14.2429 27.867C14.8183 27.9555 15.4114 27.9998 16.0045 27.9998C22.6352 27.9998 28 22.635 28 16.0043C28 15.4023 27.9557 14.8181 27.8672 14.2426Z" fill="#58E5A1" />
                <path d="M41.7216 25V7.54545H44.8835V15.5653H45.0966L51.9062 7.54545H55.767L49.017 15.3778L55.8267 25H52.0256L46.8182 17.517L44.8835 19.8011V25H41.7216ZM62.6619 25.2557C61.3494 25.2557 60.2159 24.983 59.2614 24.4375C58.3125 23.8864 57.5824 23.108 57.071 22.1023C56.5597 21.0909 56.304 19.9006 56.304 18.5312C56.304 17.1847 56.5597 16.0028 57.071 14.9858C57.5881 13.9631 58.3097 13.1676 59.2358 12.5994C60.1619 12.0256 61.25 11.7386 62.5 11.7386C63.3068 11.7386 64.0682 11.8693 64.7841 12.1307C65.5057 12.3864 66.142 12.7841 66.6932 13.3239C67.25 13.8636 67.6875 14.5511 68.0057 15.3864C67.3239 16.2159 68.483 17.2045 68.483 18.3523V19.2983H57.7528V17.2188H65.5256C65.5199 16.6278 65.392 16.1023 65.142 15.642C64.892 15.1761 64.5426 14.8097 64.0938 14.5426C63.6506 14.2756 63.1335 14.142 62.5426 14.142C61.9119 14.142 61.358 14.2955 60.8807 14.6023C60.4034 14.9034 60.0313 15.3011 59.7642 15.7955C59.5028 16.2841 59.3693 16.821 59.3636 17.4062V19.2216C59.3636 19.983 59.5028 20.6364 59.7812 21.1818C60.0597 21.7216 60.4489 22.1364 60.9489 22.4261C61.4489 22.7102 62.0341 22.8523 62.7045 22.8523C63.1534 22.8523 63.5597 22.7898 63.9233 22.6648C64.2869 22.5341 64.6023 22.3438 64.8693 22.0938C65.1364 21.8438 65.3381 21.5341 65.4744 21.1648L68.3551 21.4886C68.1733 22.25 67.8267 22.9148 67.3153 23.483C66.8097 24.0455 66.1619 24.483 65.3722 24.7955C64.5824 25.1023 63.679 25.2557 62.6619 25.2557ZM72.6357 29.9091C72.2152 29.9091 71.826 29.875 71.468 29.8068C71.1158 29.7443 70.8345 29.6705 70.6243 29.5852L71.3402 27.1818C71.7891 27.3125 72.1896 27.375 72.5419 27.3693C72.8942 27.3636 73.2038 27.2528 73.4709 27.0369C73.7436 26.8267 73.9737 26.4744 74.1612 25.9801L74.4254 25.2727L69.6783 11.9091H72.951L75.968 21.7955H76.1044L79.13 11.9091H82.4112L77.1697 26.5852C76.9254 27.2784 76.6016 27.8722 76.1982 28.3665C75.7947 28.8665 75.3004 29.2472 74.7152 29.5085C74.1357 29.7756 73.4425 29.9091 72.6357 29.9091ZM84.6825 25V7.54545H95.8643V10.196H87.8445V14.9347H95.0973V17.5852H87.8445V25H84.6825ZM103.358 25.2557C102.08 25.2557 100.972 24.9744 100.034 24.4119C99.0966 23.8494 98.3693 23.0625 97.8523 22.0511C97.3409 21.0398 97.0852 19.858 97.0852 18.5057C97.0852 17.1534 97.3409 15.9687 97.8523 14.9517C98.3693 13.9347 99.0966 13.1449 100.034 12.5824C100.972 12.0199 102.08 11.7386 103.358 11.7386C104.636 11.7386 105.744 12.0199 106.682 12.5824C107.619 13.1449 108.344 13.9347 108.855 14.9517C109.372 15.9687 109.631 17.1534 109.631 18.5057C109.631 19.858 109.372 21.0398 108.855 22.0511C108.344 23.0625 107.619 23.8494 106.682 24.4119C105.744 24.9744 104.636 25.2557 103.358 25.2557ZM103.375 22.7841C104.068 22.7841 104.648 22.5937 105.114 22.2131C105.58 21.8267 105.926 21.3097 106.153 20.6619C106.386 20.0142 106.503 19.2926 106.503 18.4972C106.503 17.696 106.386 16.9716 106.153 16.3239C105.926 15.6705 105.58 15.1506 105.114 14.7642C104.648 14.3778 104.068 14.1847 103.375 14.1847C102.665 14.1847 102.074 14.3778 101.602 14.7642C101.136 15.1506 100.787 15.6705 100.554 16.3239C100.327 16.9716 100.213 17.696 100.213 18.4972C100.213 19.2926 100.327 20.0142 100.554 20.6619C100.787 21.3097 101.136 21.8267 101.602 22.2131C102.074 22.5937 102.665 22.7841 103.375 22.7841ZM112.249 25V11.9091H115.241V14.0909H115.377C115.616 13.3352 116.025 12.7528 116.604 12.3438C117.19 11.929 117.857 11.7216 118.607 11.7216C118.778 11.7216 118.968 11.7301 119.178 11.7472C119.394 11.7585 119.573 11.7784 119.715 11.8068V14.6449C119.585 14.5994 119.377 14.5597 119.093 14.5256C118.815 14.4858 118.545 14.4659 118.283 14.4659C117.721 14.4659 117.215 14.5881 116.766 14.8324C116.323 15.071 115.974 15.4034 115.718 15.8295C115.462 16.2557 115.335 16.7472 115.335 17.304V25H112.249ZM126.919 30.1818C125.811 30.1818 124.859 30.0313 124.064 29.7301C123.268 29.4347 122.629 29.0369 122.146 28.5369C121.663 28.0369 121.328 27.483 121.141 26.875L123.919 26.2017C124.044 26.4574 124.226 26.7102 124.464 26.9602C124.703 27.2159 125.024 27.4261 125.428 27.5909C125.837 27.7614 126.351 27.8466 126.97 27.8466C127.845 27.8466 128.57 27.6335 129.143 27.2074C129.717 26.7869 130.004 26.0938 130.004 25.1278V22.6477H129.851C129.692 22.9659 129.459 23.2926 129.152 23.6278C128.851 23.9631 128.45 24.2443 127.95 24.4716C127.456 24.6989 126.834 24.8125 126.084 24.8125C125.078 24.8125 124.166 24.5767 123.348 24.1051C122.536 23.6278 121.888 22.9176 121.405 21.9744C120.928 21.0256 120.689 19.8381 120.689 18.4119C120.689 16.9744 120.928 15.7614 121.405 14.7727C121.888 13.7784 122.538 13.0256 123.357 12.5142C124.175 11.9972 125.087 11.7386 126.092 11.7386C126.859 11.7386 127.49 11.8693 127.984 12.1307C128.484 12.3864 128.882 12.696 129.178 13.0597C129.473 13.4176 129.697 13.7557 129.851 14.0739H130.021V11.9091H133.064V25.2131C133.064 26.3324 132.797 27.2585 132.263 27.9915C131.729 28.7244 130.999 29.2727 130.072 29.6364C129.146 30 128.095 30.1818 126.919 30.1818ZM126.945 22.392C127.598 22.392 128.155 22.233 128.615 21.9148C129.075 21.5966 129.425 21.1392 129.663 20.5426C129.902 19.946 130.021 19.2301 130.021 18.3949C130.021 17.571 129.902 16.8494 129.663 16.2301C129.43 15.6108 129.084 15.1307 128.624 14.7898C128.169 14.4432 127.609 14.2699 126.945 14.2699C126.257 14.2699 125.683 14.4489 125.223 14.8068C124.763 15.1648 124.416 15.6562 124.183 16.2812C123.95 16.9006 123.834 17.6051 123.834 18.3949C123.834 19.196 123.95 19.8977 124.183 20.5C124.422 21.0966 124.771 21.5625 125.232 21.8977C125.697 22.2273 126.268 22.392 126.945 22.392ZM142.021 25.2557C140.709 25.2557 139.575 24.983 138.621 24.4375C137.672 23.8864 136.942 23.108 136.43 22.1023C135.919 21.0909 135.663 19.9006 135.663 18.5312C135.663 17.1847 135.919 16.0028 136.43 14.9858C136.947 13.9631 137.669 13.1676 138.595 12.5994C139.521 12.0256 140.609 11.7386 141.859 11.7386C142.666 11.7386 143.428 11.8693 144.143 12.1307C144.865 12.3864 145.501 12.7841 146.053 13.3239C146.609 13.8636 147.047 14.5511 147.365 15.3864C147.683 16.2159 147.842 17.2045 147.842 18.3523V19.2983H137.112V17.2188H144.885C144.879 16.6278 144.751 16.1023 144.501 15.642C144.251 15.1761 143.902 14.8097 143.453 14.5426C143.01 14.2756 142.493 14.142 141.902 14.142C141.271 14.142 140.717 14.2955 140.24 14.6023C139.763 14.9034 139.391 15.3011 139.124 15.7955C138.862 16.2841 138.729 16.821 138.723 17.4062V19.2216C138.723 19.983 138.862 20.6364 139.141 21.1818C139.419 21.7216 139.808 22.1364 140.308 22.4261C140.808 22.7102 141.393 22.8523 142.064 22.8523C142.513 22.8523 142.919 22.7898 143.283 22.6648C143.646 22.5341 143.962 22.3438 144.229 22.0938C144.496 21.8438 144.697 21.5341 144.834 21.1648L147.714 21.4886C147.533 22.25 147.186 22.9148 146.675 23.483C146.169 24.0455 145.521 24.483 144.732 24.7955C143.942 25.1023 143.038 25.2557 142.021 25.2557Z" fill="#3B82F6" />
              </svg>
            </div>
          </div>

          {/* Login Form */}
          <div className="bg-white">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">Log In</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                  {error}
                </div>
              )}

              {/* User ID Field */}
              <div>
                <label htmlFor="userid" className="block text-sm font-medium text-gray-700 mb-2">
                  User ID*
                </label>
                <input
                  type="text"
                  id="userid"
                  value={userid}
                  onChange={(e) => setUserid(e.target.value)}
                  placeholder="Insert your User ID"
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password*
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Insert your password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>

            {/* Registration Link */}
            <div className="mt-8 text-center">
              <p className="text-gray-600">
                Don't have an account?{' '}
                <a href="#" className="text-blue-600 hover:text-blue-700 font-medium">
                  Register with SSO
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .grid-pattern {
          background-image: 
            linear-gradient(rgba(0, 0, 0, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 0, 0, 0.1) 1px, transparent 1px);
          background-size: 20px 20px;
        }
      `}</style>
    </div>
  );
}
