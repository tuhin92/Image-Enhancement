import { useState, useRef, useEffect } from "react";
import Head from "next/head";

export default function Home() {
  const [originalImage, setOriginalImage] = useState(null);
  const [enhancedImage, setEnhancedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [fullscreenMode, setFullscreenMode] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const fileInputRef = useRef(null);

  // Theme management
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      setDarkMode(savedTheme === "dark");
    } else {
      setDarkMode(window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  // --- Metric interpretation helpers (PSNR, SSIM, MSE) ---
  const getPsnrInfo = (psnr) => {
    if (typeof psnr !== "number" || !isFinite(psnr)) return null;
    if (psnr > 30) {
      return {
        range: "> 30 dB",
        desc:
          "Very little change – enhancement is mild and very close to the input.",
      };
    }
    if (psnr > 20) {
      return {
        range: "20 – 30 dB",
        desc:
          "Moderate changes – natural enhancement with only slight modification.",
      };
    }
    if (psnr > 10) {
      return {
        range: "10 – 20 dB",
        desc: "Strong enhancement – normal for low‑light correction.",
      };
    }
    return {
      range: "< 10 dB",
      desc:
        "Heavy modification – very strong adjustment of brightness and contrast.",
    };
  };

  const getSsimInfo = (ssim) => {
    if (typeof ssim !== "number" || !isFinite(ssim)) return null;
    if (ssim >= 0.8) {
      return {
        range: "0.80 – 1.00",
        desc:
          "Very high structural similarity – enhancement is mild and close to the original.",
      };
    }
    if (ssim >= 0.5) {
      return {
        range: "0.50 – 0.80",
        desc:
          "Moderate similarity – natural enhancement with some structure changes.",
      };
    }
    if (ssim >= 0.3) {
      return {
        range: "0.30 – 0.50",
        desc: "Noticeable structural change – common for illumination correction.",
      };
    }
    return {
      range: "< 0.30",
      desc:
        "Strong structural change – strong enhancement where textures are altered a lot.",
    };
  };

  const getMseInfo = (mse) => {
    if (typeof mse !== "number" || !isFinite(mse)) return null;
    if (mse <= 500) {
      return {
        range: "0 – 500",
        desc: "Almost identical – hardly any enhancement applied.",
      };
    }
    if (mse <= 2000) {
      return {
        range: "500 – 2000",
        desc: "Moderate pixel difference – mild enhancement.",
      };
    }
    if (mse <= 6000) {
      return {
        range: "2000 – 6000",
        desc:
          "Strong pixel‑level change – typical for effective low‑light enhancement.",
      };
    }
    return {
      range: "> 6000",
      desc:
        "Heavy pixel difference – very strong brightening or color changes.",
    };
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    handleFile(file);
  };

  const handleFile = (file) => {
    if (file) {
      // Validate file type
      const validTypes = ["image/jpeg", "image/jpg", "image/png"];
      if (!validTypes.includes(file.type)) {
        setError("Please select a valid image file (JPG, JPEG, or PNG)");
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError("File size must be less than 10MB");
        return;
      }

      setError("");
      setSelectedFile(file);
      setOriginalImage(URL.createObjectURL(file));
      setEnhancedImage(null);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!originalImage || !selectedFile) {
      setError("Please select an image first");
      return;
    }

    setIsLoading(true);
    setError("");
    console.log("Starting image enhancement...");

    try {
      const formData = new FormData();
      console.log("File to upload:", selectedFile);
      formData.append("image", selectedFile);

      console.log("Sending request to /api/enhance...");
      const response = await fetch("/api/enhance", {
        method: "POST",
        body: formData,
      });

      console.log("Response status:", response.status);
      console.log("Response headers:", response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Response error:", errorText);
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorText}`
        );
      }

      // Expect JSON { image: base64, mime: 'image/jpeg', metrics: { mse, psnr, ssim } }
      const json = await response.json();
      console.log('Received JSON response with metrics:', json.metrics);
      const enhancedImageUrl = `data:${json.mime};base64,${json.image}`;
      setEnhancedImage(enhancedImageUrl);
      setMetrics(json.metrics || null);
    } catch (err) {
      console.error("Error enhancing image:", err);
      setError(`Failed to enhance image: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setOriginalImage(null);
    setEnhancedImage(null);
    setSelectedFile(null);
    setMetrics(null);
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDownload = (imageSrc, filename) => {
    if (imageSrc) {
      const link = document.createElement("a");
      link.href = imageSrc;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const openFullscreen = (imageSrc, type) => {
    setFullscreenImage({ src: imageSrc, type });
    setFullscreenMode(true);
  };

  const closeFullscreen = () => {
    setFullscreenMode(false);
    setFullscreenImage(null);
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        darkMode
          ? "bg-gray-950 text-white"
          : "bg-slate-200 text-gray-900"
      }`}
    >
      <Head>
        <title>Low Light Image Enhancement</title>
        <meta
          name="description"
          content="Professional low-light image enhancement using hybrid LIME and Zero-DCE models"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Header with Theme Toggle */}
      <header className={`sticky top-0 z-50 backdrop-blur-lg border-b transition-colors duration-300 ${
        darkMode 
          ? "bg-gray-900/80 border-gray-800" 
          : "bg-slate-200/95 border-blue-200 shadow-md"
      }`}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="relative group">
                <div className="absolute inset-0 bg-blue-500 rounded-xl blur opacity-60 group-hover:opacity-90 transition duration-300"></div>
                <div className="relative inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-xl shadow-lg">
                  <svg
                    className="w-5 h-5 sm:w-7 sm:h-7 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
              </div>
              <div>
                <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white">
                  Image Enhancement Platform
                </h1>
                <p className="text-xs sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 hidden sm:block">Hybrid LIME + Zero-DCE Technology</p>
              </div>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`relative w-16 h-8 sm:w-20 sm:h-10 rounded-full transition-all duration-300 flex-shrink-0 ${
                darkMode
                  ? "bg-gray-700"
                  : "bg-gray-300"
              }`}
            >
              <div
                className={`absolute top-1 left-1 w-6 h-6 sm:w-8 sm:h-8 rounded-full transition-all duration-300 flex items-center justify-center ${
                  darkMode
                    ? "translate-x-8 sm:translate-x-10 bg-gray-900"
                    : "translate-x-0 bg-white"
                }`}
              >
                {darkMode ? (
                  <svg
                    className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-300"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-8 sm:py-12">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Section */}
          <div className="text-center mb-8 sm:mb-12 lg:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 text-blue-600 dark:text-blue-300 tracking-tight px-2">
              Professional Image Enhancement
            </h2>
            <div className="mx-auto h-0.5 w-24 sm:w-32 bg-blue-500/60 rounded-full mb-4 sm:mb-6" />
            <p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed px-2">
              Low-Light image enhancement by {" "}
              <span className="font-semibold text-blue-600 dark:text-blue-300">
                Hybrid LIME and Zero-DCE Models
              </span>
              .
            </p>
          </div>

          {/* Upload Section - Hidden after image selection */}
          {!originalImage && (
            <div
              className={`rounded-2xl p-4 sm:p-6 lg:p-10 mb-6 sm:mb-8 border transition-all duration-300 backdrop-blur-sm ${
                darkMode
                  ? "bg-gradient-to-br from-gray-800/90 to-gray-900/90 border-blue-500/30 shadow-2xl shadow-blue-900/20"
                  : "bg-white/95 border-blue-300 shadow-2xl shadow-blue-200/60"
              }`}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-3 sm:gap-0">
                <h3 className="text-xl sm:text-2xl font-bold dark:text-white flex items-center">
                  <div className={`p-2 sm:p-3 rounded-xl mr-3 sm:mr-4 ${
                    darkMode 
                      ? "bg-gradient-to-br from-blue-600/20 to-indigo-600/20" 
                      : "bg-gradient-to-br from-blue-200 to-indigo-200"
                  }`}>
                    <svg
                      className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 dark:text-purple-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                  </div>
                  <span className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                    <span>Upload Your Image</span>
                    <span className={`text-xs sm:text-sm font-normal px-3 py-1 rounded-full inline-block ${
                      darkMode 
                        ? "bg-blue-600/20 text-blue-300" 
                        : "bg-blue-100 text-blue-700"
                    }`}>
                      Step 1
                    </span>
                  </span>
                </h3>
              </div>

              {/* Drag & Drop Area */}
              <div
                className={`relative border-2 border-dashed rounded-2xl sm:rounded-3xl p-8 sm:p-12 lg:p-16 text-center transition-all duration-300 overflow-hidden ${
                  dragActive
                    ? "border-blue-500 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-purple-900/30 dark:to-pink-900/30 scale-[1.02]"
                    : darkMode
                    ? "border-gray-600 hover:border-purple-400 hover:bg-gradient-to-br hover:from-gray-700/50 hover:to-slate-700/50"
                    : "border-blue-300 hover:border-blue-400 hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {dragActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-blue-500/10 animate-pulse"></div>
                )}
                
                <div className="relative space-y-4 sm:space-y-6 lg:space-y-8">
                  <div className={`mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center ${
                    darkMode 
                      ? "bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/50" 
                      : "bg-gradient-to-br from-blue-500 to-indigo-500 shadow-lg shadow-blue-400/50"
                  }`}>
                    <svg
                      className="h-8 w-8 sm:h-10 sm:w-10 text-white"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg sm:text-xl lg:text-2xl font-bold dark:text-white mb-2 sm:mb-3 px-2">
                      {dragActive
                        ? "Drop your image here"
                        : "Drag and drop your image here"}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 text-base sm:text-lg">or</p>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="relative inline-flex items-center px-6 sm:px-8 lg:px-10 py-3 sm:py-4 lg:py-5 border-0 text-base sm:text-lg font-bold rounded-xl sm:rounded-2xl text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-700 hover:via-indigo-700 hover:to-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800 transition-all duration-200 shadow-2xl hover:shadow-blue-500/50 hover:scale-105 transform"
                  >
                    <svg
                      className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    Choose File
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="flex items-center justify-center space-x-6 text-sm text-gray-500 dark:text-gray-400 pt-4">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      JPG, JPEG, PNG
                    </div>
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Max 10MB
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className={`mt-8 p-5 rounded-2xl border backdrop-blur-sm ${
                  darkMode 
                    ? "bg-red-900/20 border-red-500/30" 
                    : "bg-red-50 border-red-200"
                }`}>
                  <div className="flex items-center">
                    <div className="p-2 rounded-lg bg-red-500/20 mr-4">
                      <svg
                        className="w-6 h-6 text-red-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <p className="text-red-700 dark:text-red-300 font-semibold text-lg">
                      {error}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Image Preview Section */}
          {originalImage && (
            <div
              className={`rounded-2xl p-4 sm:p-6 lg:p-10 border transition-all duration-300 backdrop-blur-sm ${
                darkMode
                  ? "bg-gradient-to-br from-gray-800/90 to-gray-900/90 border-blue-500/30 shadow-2xl shadow-blue-900/20"
                  : "bg-white/90 border-blue-200 shadow-2xl shadow-blue-100/50"
              }`}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 lg:mb-10 gap-3 sm:gap-0">
                <h3 className="text-xl sm:text-2xl font-bold dark:text-white flex items-center">
                  <div className={`p-2 sm:p-3 rounded-xl mr-3 sm:mr-4 ${
                    darkMode 
                      ? "bg-gradient-to-br from-green-600/20 to-emerald-600/20" 
                      : "bg-gradient-to-br from-green-100 to-emerald-100"
                  }`}>
                    <svg
                      className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 dark:text-green-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <span className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                    <span>Compare Results</span>
                    <span className={`text-xs sm:text-sm font-normal px-3 py-1 rounded-full inline-block ${
                      darkMode 
                        ? "bg-blue-600/20 text-blue-300" 
                        : "bg-blue-100 text-blue-700"
                    }`}>
                      Step 2
                    </span>
                  </span>
                </h3>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8 lg:mb-10">
                {/* Original Image */}
                <div className="space-y-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xl font-bold dark:text-white flex items-center">
                      <div className={`p-2 rounded-lg mr-3 ${
                        darkMode ? "bg-gray-700" : "bg-gray-100"
                      }`}>
                        <svg
                          className="w-5 h-5 text-gray-600 dark:text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      Original
                    </h4>
                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold ${
                      darkMode 
                        ? "bg-gray-700 text-gray-300" 
                        : "bg-gray-200 text-gray-700"
                    }`}>
                      BEFORE
                    </span>
                  </div>
                  {originalImage && (
                    <div className="relative group">
                      <div
                        className={`relative border-2 rounded-2xl overflow-hidden shadow-xl transition-all duration-300 ${
                          darkMode
                            ? "border-gray-600 bg-gray-900 hover:border-purple-500/50 hover:shadow-purple-500/20"
                            : "border-gray-300 bg-white hover:border-purple-400 hover:shadow-purple-300/30"
                        } cursor-pointer transform hover:scale-[1.02]`}
                        onClick={() =>
                          openFullscreen(originalImage, "Original")
                        }
                        tabIndex={0}
                        role="button"
                        aria-label="Preview original image full screen"
                      >
                        <img
                          src={originalImage}
                          alt="Original"
                          className="w-full h-auto max-h-96 object-contain bg-gray-50 dark:bg-gray-800 select-none pointer-events-none"
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={(e) => {
                            e.stopPropagation();
                            openFullscreen(originalImage, "Original");
                          }}
                          className={`absolute top-4 right-4 p-3 rounded-xl backdrop-blur-md shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 ${
                            darkMode 
                              ? "bg-gray-800/90 hover:bg-gray-700 text-gray-200" 
                              : "bg-white/90 hover:bg-white text-gray-700"
                          }`}
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                            />
                          </svg>
                        </button>
                      </div>
                      {/* Download Original Button */}
                      <div className="mt-5">
                        <button
                          onClick={() =>
                            handleDownload(originalImage, "original-image.jpg")
                          }
                          className={`w-full inline-flex items-center justify-center px-5 py-4 border-2 text-base font-bold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 ${
                            darkMode 
                              ? "border-gray-600 text-gray-300 bg-gray-800 hover:bg-gray-700 hover:border-gray-500" 
                              : "border-gray-300 text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400"
                          }`}
                        >
                          <svg
                            className="w-5 h-5 mr-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2.5}
                              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          Download Original
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Enhanced Image */}
                <div className="space-y-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xl font-bold dark:text-white flex items-center">
                      <div className={`p-2 rounded-lg mr-3 ${
                        darkMode 
                          ? "bg-gradient-to-br from-green-600/20 to-emerald-600/20" 
                          : "bg-gradient-to-br from-green-100 to-emerald-100"
                      }`}>
                        <svg
                          className="w-5 h-5 text-green-600 dark:text-green-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      Enhanced
                    </h4>
                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold ${
                      darkMode 
                        ? "bg-gradient-to-r from-green-600/20 to-emerald-600/20 text-green-300 border border-green-500/30" 
                        : "bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border border-green-300"
                    }`}>
                      AFTER
                    </span>
                  </div>
                  {isLoading ? (
                    <div
                      className={`border-2 border-dashed rounded-2xl h-96 flex items-center justify-center transition-colors duration-300 ${
                        darkMode
                          ? "border-purple-500/50 bg-gradient-to-br from-purple-900/20 to-pink-900/20"
                          : "border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50"
                      }`}
                    >
                      <div className="text-center">
                        <div className="relative w-16 h-16 mx-auto mb-6">
                          <div className="absolute inset-0 rounded-full border-4 border-purple-200 dark:border-purple-800"></div>
                          <div className="absolute inset-0 rounded-full border-4 border-t-purple-600 dark:border-t-purple-400 animate-spin"></div>
                        </div>
                        <p className="dark:text-white font-bold text-lg mb-1">
                          🎨 Processing your image...
                        </p>
                      </div>
                    </div>
                  ) : enhancedImage ? (
                    <div className="relative group">
                      <div
                        className={`relative border-2 rounded-2xl overflow-hidden shadow-xl transition-all duration-300 ${
                          darkMode 
                            ? "border-green-600/50 bg-gray-900 hover:border-green-500 hover:shadow-green-500/30" 
                            : "border-green-300 bg-white hover:border-green-400 hover:shadow-green-300/40"
                        } cursor-pointer transform hover:scale-[1.02]`}
                        onClick={() =>
                          openFullscreen(enhancedImage, "Enhanced")
                        }
                        tabIndex={0}
                        role="button"
                        aria-label="Preview enhanced image full screen"
                      >
                        <div className="absolute top-4 left-4 z-10">
                          <span className={`px-3 py-1.5 rounded-lg text-xs font-bold backdrop-blur-md ${
                            darkMode 
                              ? "bg-green-600/90 text-white" 
                              : "bg-green-500 text-white"
                          }`}>
                            ✨ ENHANCED
                          </span>
                        </div>
                        <img
                          src={enhancedImage}
                          alt="Enhanced"
                          className="w-full h-auto max-h-96 object-contain bg-gray-50 dark:bg-gray-800 select-none pointer-events-none"
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={(e) => {
                            e.stopPropagation();
                            openFullscreen(enhancedImage, "Enhanced");
                          }}
                          className={`absolute top-4 right-4 p-3 rounded-xl backdrop-blur-md shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 ${
                            darkMode 
                              ? "bg-gray-800/90 hover:bg-gray-700 text-gray-200" 
                              : "bg-white/90 hover:bg-white text-gray-700"
                          }`}
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                            />
                          </svg>
                        </button>
                      </div>
                      {/* Download Enhanced Button */}
                      <div className="mt-5">
                        <button
                          onClick={() =>
                            handleDownload(enhancedImage, "enhanced-image.jpg")
                          }
                          className="w-full inline-flex items-center justify-center px-5 py-4 border-0 text-base font-bold rounded-xl text-white bg-gradient-to-r from-green-600 via-emerald-600 to-green-600 hover:from-green-700 hover:via-emerald-700 hover:to-green-700 focus:outline-none focus:ring-4 focus:ring-green-300 dark:focus:ring-green-800 transition-all duration-200 shadow-2xl hover:shadow-green-500/50 transform hover:scale-105"
                        >
                          <svg
                            className="w-5 h-5 mr-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2.5}
                              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          Download Enhanced
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`border-2 border-dashed rounded-2xl h-96 flex items-center justify-center transition-colors duration-300 ${
                        darkMode
                          ? "border-gray-600 bg-gray-900/50"
                          : "border-gray-300 bg-gray-50"
                      }`}
                    >
                      <div className="text-center text-gray-500 dark:text-gray-400">
                        <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${
                          darkMode ? "bg-gray-800" : "bg-gray-200"
                        }`}>
                          <svg
                            className="h-8 w-8"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                        <p className="font-bold text-lg mb-2">
                          Enhanced image will appear here
                        </p>
                        <p className="text-sm">
                          Click "Enhance Image" below to process
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Metrics Matrix - Full Width */}
              {metrics ? (
                <div className="mb-6 sm:mb-8 p-5 sm:p-6 rounded-xl border bg-white/60 dark:bg-gray-800/60 shadow-lg">
                  <h5 className="text-base sm:text-lg font-bold mb-4 text-gray-700 dark:text-gray-200">Result Metrics</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                    <div className="flex flex-col p-4 rounded-lg bg-white/80 dark:bg-gray-900/50">
                      <span className="font-semibold text-gray-500 dark:text-gray-400 mb-1">MSE</span>
                      <span className="text-2xl font-bold text-gray-800 dark:text-white mb-2">{metrics.mse?.toFixed ? metrics.mse.toFixed(3) : String(metrics.mse)}</span>
                      <span className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                        {getMseInfo(metrics.mse)?.desc}
                      </span>
                    </div>
                    <div className="flex flex-col p-4 rounded-lg bg-white/80 dark:bg-gray-900/50">
                      <span className="font-semibold text-gray-500 dark:text-gray-400 mb-1">PSNR</span>
                      <span className="text-2xl font-bold text-gray-800 dark:text-white mb-2">{metrics.psnr?.toFixed ? metrics.psnr.toFixed(2) : String(metrics.psnr)} dB</span>
                      <span className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                        {getPsnrInfo(metrics.psnr)?.desc}
                      </span>
                    </div>
                    <div className="flex flex-col p-4 rounded-lg bg-white/80 dark:bg-gray-900/50">
                      <span className="font-semibold text-gray-500 dark:text-gray-400 mb-1">SSIM</span>
                      <span className="text-2xl font-bold text-gray-800 dark:text-white mb-2">{metrics.ssim?.toFixed ? metrics.ssim.toFixed(4) : String(metrics.ssim)}</span>
                      <span className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                        {getSsimInfo(metrics.ssim)?.desc}
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Action Buttons - Inside Compare Results Box */}
              <div className="text-center pt-4">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5">
                  <button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="relative group inline-flex items-center justify-center w-full sm:w-auto px-8 sm:px-10 lg:px-12 py-4 sm:py-5 border-0 text-lg sm:text-xl font-extrabold rounded-xl sm:rounded-2xl text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-700 hover:via-indigo-700 hover:to-blue-700 disabled:from-gray-400 disabled:via-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-300 shadow-2xl hover:shadow-blue-500/50 transform hover:scale-110 disabled:transform-none disabled:shadow-lg"
                  >
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 blur opacity-75 group-hover:opacity-100 transition duration-300"></div>
                    <span className="relative flex items-center">
                      {isLoading ? (
                        <>
                          <svg
                            className="animate-spin -ml-1 mr-4 h-7 w-7 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Processing...
                        </>
                      ) : (
                        <>
                          <svg
                            className="w-7 h-7 mr-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2.5}
                              d="M13 10V3L4 14h7v7l9-11h-7z"
                            />
                          </svg>
                          Enhance Image
                        </>
                      )}
                    </span>
                  </button>

                  <button
                    onClick={handleReset}
                    className={`w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 border-2 text-base sm:text-lg font-bold rounded-xl sm:rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 ${
                      darkMode 
                        ? "border-gray-600 text-gray-300 bg-gray-800 hover:bg-gray-700 hover:border-gray-500" 
                        : "border-gray-300 text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400"
                    }`}
                  >
                    <svg
                      className="w-6 h-6 mr-3 inline"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    <span>Reset</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Info Section */}
          <div
            className={`mt-8 sm:mt-10 lg:mt-12 rounded-2xl p-4 sm:p-6 lg:p-10 border transition-all duration-300 backdrop-blur-sm ${
              darkMode
                ? "bg-gradient-to-br from-blue-900/30 via-indigo-900/30 to-blue-900/30 border-blue-500/30 shadow-xl"
                : "bg-gradient-to-br from-white/90 via-blue-50/90 to-indigo-50/90 border-blue-300 shadow-xl"
            }`}
          >
            <div className="flex flex-col sm:flex-row items-start space-y-4 sm:space-y-0 sm:space-x-5">
              <div className={`flex-shrink-0 p-3 sm:p-4 rounded-2xl ${
                darkMode 
                  ? "bg-gradient-to-br from-blue-600/20 to-purple-600/20" 
                  : "bg-gradient-to-br from-blue-100 to-purple-100"
              }`}>
                <svg
                  className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 dark:text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent">
                  About Our Hybrid Model
                </h3>
                <div className="space-y-4">
                  <p className="text-gray-700 dark:text-gray-300 text-base leading-relaxed">
                    Our advanced hybrid model combines the strengths of{" "}
                    <span className="font-bold text-blue-600 dark:text-blue-400">LIME (Low-Light Image Enhancement)</span> and{" "}
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">Zero-DCE (Zero-Reference Deep Curve Estimation)</span> algorithms.
                  </p>
                  
                  <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-4 sm:mt-6 p-4 sm:p-5 rounded-xl sm:rounded-2xl ${
                    darkMode ? "bg-black/20" : "bg-blue-50/80"
                  }`}>
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          darkMode ? "bg-blue-600/30" : "bg-blue-200"
                        }`}>
                          <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold dark:text-white">Brightness Enhancement</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Advanced illumination optimization</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          darkMode ? "bg-indigo-600/30" : "bg-indigo-200"
                        }`}>
                          <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold dark:text-white">Improved Contrast</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Dynamic range enhancement</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          darkMode ? "bg-blue-600/30" : "bg-blue-200"
                        }`}>
                          <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold dark:text-white">Noise Reduction</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Smart denoising algorithms</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          darkMode ? "bg-indigo-600/30" : "bg-indigo-200"
                        }`}>
                          <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold dark:text-white">Color Correction</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Natural color balance restoration</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          darkMode ? "bg-blue-600/30" : "bg-blue-200"
                        }`}>
                          <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold dark:text-white">Exposure Equalization</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Balanced light distribution</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          darkMode ? "bg-indigo-600/30" : "bg-indigo-200"
                        }`}>
                          <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold dark:text-white">Reduced Artifacts</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Minimized processing artifacts</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          darkMode ? "bg-blue-600/30" : "bg-blue-200"
                        }`}>
                          <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold dark:text-white">Structural Detail Preservation</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Maintains fine image details</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className={`mt-12 border-t transition-colors duration-300 ${
        darkMode 
          ? "bg-gray-900 border-gray-800" 
          : "bg-slate-300 border-gray-50"
      }`}>
        <div className="container mx-auto px-6 sm:px-8 lg:px-12 xl:px-16 2xl:px-20 py-8">
          {/* Top Section */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-6 pb-6 border-b border-gray-700 dark:border-gray-800">
            {/* Left - Branding */}
            <div className="text-center md:text-left">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-1">
                Image Enhancement Platform
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Low-Light image enhancement by Hybrid Model
              </p>
            </div>

            {/* Right - GitHub Link */}
            <a
              href="https://github.com/tuhin92/Image-Enhancement"
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 hover:scale-105 ${
                darkMode
                  ? "bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700"
                  : "bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 shadow-sm"
              }`}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              <span>GitHub</span>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>

          {/* Bottom Section */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
            {/* Copyright */}
            <p className="text-gray-600 dark:text-gray-400">
              © 2026 All rights reserved
            </p>

            {/* Developers */}
            <div className="flex items-center gap-4">
              <span className="text-gray-600 dark:text-gray-400">Developed by</span>
              <div className="flex items-center gap-3">
                <a
                  href="https://www.linkedin.com/in/tuhin92/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all duration-200 hover:scale-105 ${
                    darkMode
                      ? "bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700"
                      : "bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm"
                  }`}
                >
                  <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  <span>Mamun</span>
                </a>
                <a
                  href="https://www.linkedin.com/in/md-jobayer-ahmed-4a3144366/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all duration-200 hover:scale-105 ${
                    darkMode
                      ? "bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700"
                      : "bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm"
                  }`}
                >
                  <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  <span>Jobayer</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Fullscreen Modal */}
      {fullscreenMode && fullscreenImage && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-50 flex items-center justify-center p-6 animate-fadeIn">
          <div className="relative max-w-7xl max-h-full w-full">
            {/* Close Button */}
            <div className="absolute -top-2 right-0 z-10">
              <button
                onClick={closeFullscreen}
                className="group p-4 bg-gradient-to-r from-red-600 to-pink-600 backdrop-blur-md rounded-2xl text-white hover:from-red-700 hover:to-pink-700 transition-all duration-200 shadow-2xl hover:shadow-red-500/50 transform hover:scale-110"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            
            {/* Image Title */}
            <div className="text-center mb-6">
              <div className="inline-block">
                <h3 className="text-white text-2xl font-bold px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600/30 via-indigo-600/30 to-blue-600/30 backdrop-blur-md border border-white/20">
                  {fullscreenImage.type} Image
                </h3>
              </div>
            </div>
            
            {/* Image Container */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 rounded-3xl blur-2xl opacity-20"></div>
              <img
                src={fullscreenImage.src}
                alt={fullscreenImage.type}
                className="relative max-w-full max-h-[75vh] object-contain rounded-3xl shadow-2xl mx-auto border-4 border-white/10"
              />
            </div>
            
            {/* Download Button */}
            <div className="text-center mt-6">
              <button
                onClick={() => handleDownload(
                  fullscreenImage.src, 
                  `${fullscreenImage.type.toLowerCase()}-image.jpg`
                )}
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-2xl transition-all duration-200 shadow-2xl hover:shadow-blue-500/50 transform hover:scale-105"
              >
                <svg
                  className="w-5 h-5 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Download Image
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
