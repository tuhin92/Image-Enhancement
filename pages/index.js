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

      const blob = await response.blob();
      console.log("Received blob:", blob);
      const enhancedImageUrl = URL.createObjectURL(blob);
      console.log("Created enhanced image URL:", enhancedImageUrl);
      setEnhancedImage(enhancedImageUrl);
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
        darkMode ? "bg-gray-900 text-white" : "bg-white text-gray-900"
      }`}
    >
      <Head>
        <title>LIME Image Enhancement Tool</title>
        <meta
          name="description"
          content="Low-Light Image Enhancement using LIME algorithm"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Header with Theme Toggle */}
      <header className="border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div
                className={`inline-flex items-center justify-center w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg`}
              >
                <svg
                  className="w-6 h-6 text-white"
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
              <div>
                <h1 className="text-xl font-bold">LIME Enhancement</h1>
              </div>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-3 rounded-xl transition-all duration-200 ${
                darkMode
                  ? "bg-gray-800 hover:bg-gray-700 text-yellow-400"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-600"
              }`}
            >
              {darkMode ? (
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Welcome Section */}
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 dark:text-white">
              Transform Your Low-Light Images
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Upload your dark or underexposed images and watch them transform
              into clear, vibrant photos using our advanced model.
            </p>
          </div>

          {/* Upload Section - Hidden after image selection */}
          {!originalImage && (
            <div
              className={`rounded-3xl p-8 mb-8 border transition-colors duration-300 ${
                darkMode
                  ? "bg-gray-800 border-gray-700"
                  : "bg-gray-50 border-gray-100"
              }`}
            >
              <h3 className="text-xl font-semibold mb-6 dark:text-white flex items-center">
                <svg
                  className="w-5 h-5 mr-3 text-blue-600"
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
                Step 1: Upload Your Image
              </h3>

              {/* Drag & Drop Area */}
              <div
                className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
                  dragActive
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : darkMode
                    ? "border-gray-600 hover:border-blue-400 hover:bg-gray-700"
                    : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className="space-y-6">
                  <svg
                    className="mx-auto h-14 w-14 text-gray-400"
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
                  <div>
                    <p className="text-xl font-medium dark:text-white mb-2">
                      {dragActive
                        ? "Drop your image here"
                        : "Drag and drop your image here"}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400">or</p>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center px-8 py-4 border border-transparent text-base font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 shadow-lg hover:shadow-xl"
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
                        strokeWidth={2}
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
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Supports JPG, JPEG, PNG • Max 10MB
                  </p>
                </div>
              </div>

              {error && (
                <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 text-red-400 mr-3"
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
                    <p className="text-red-700 dark:text-red-300 font-medium">
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
              className={`rounded-3xl p-8 border transition-colors duration-300 ${
                darkMode
                  ? "bg-gray-800 border-gray-700"
                  : "bg-gray-50 border-gray-100"
              }`}
            >
              <h3 className="text-xl font-semibold mb-8 dark:text-white flex items-center">
                <svg
                  className="w-5 h-5 mr-3 text-green-600"
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
                Step 2: Compare Results
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Original Image */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-medium dark:text-white flex items-center">
                      <svg
                        className="w-4 h-4 mr-2 text-gray-500"
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
                      Original
                    </h4>
                    <span className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-full font-medium">
                      Before
                    </span>
                  </div>
                  {originalImage && (
                    <div className="relative group">
                      <div
                        className={`border rounded-2xl overflow-hidden shadow-lg transition-colors duration-300 ${
                          darkMode
                            ? "border-gray-600 bg-gray-900"
                            : "border-gray-200 bg-white"
                        } cursor-pointer`}
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
                          className="w-full h-auto max-h-80 object-contain bg-gray-50 dark:bg-gray-800 select-none pointer-events-none"
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={(e) => {
                            e.stopPropagation();
                            openFullscreen(originalImage, "Original");
                          }}
                          className="absolute top-3 right-3 p-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-white dark:hover:bg-gray-700"
                        >
                          <svg
                            className="w-4 h-4 text-gray-600 dark:text-gray-300"
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
                      <div className="mt-4">
                        <button
                          onClick={() =>
                            handleDownload(originalImage, "original-image.jpg")
                          }
                          className="w-full inline-flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-xl text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all duration-200 shadow-lg hover:shadow-xl"
                        >
                          <svg
                            className="w-4 h-4 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          Download Original Image
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Enhanced Image */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-medium dark:text-white flex items-center">
                      <svg
                        className="w-4 h-4 mr-2 text-green-600"
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
                      Enhanced
                    </h4>
                    <span className="px-3 py-1 bg-green-200 dark:bg-green-800 text-green-700 dark:text-green-300 text-xs rounded-full font-medium">
                      After
                    </span>
                  </div>
                  {isLoading ? (
                    <div
                      className={`border rounded-2xl h-80 flex items-center justify-center transition-colors duration-300 ${
                        darkMode
                          ? "border-gray-600 bg-gray-900"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="dark:text-white font-medium">
                          Processing your image...
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                          This may take a few moments
                        </p>
                      </div>
                    </div>
                  ) : enhancedImage ? (
                    <div className="relative">
                      <div
                        className={`border border-green-200 dark:border-green-800 rounded-2xl overflow-hidden shadow-lg transition-colors duration-300 ${
                          darkMode ? "bg-gray-900" : "bg-white"
                        } cursor-pointer`}
                        onClick={() =>
                          openFullscreen(enhancedImage, "Enhanced")
                        }
                        tabIndex={0}
                        role="button"
                        aria-label="Preview enhanced image full screen"
                      >
                        <img
                          src={enhancedImage}
                          alt="Enhanced"
                          className="w-full h-auto max-h-80 object-contain bg-gray-50 dark:bg-gray-800 select-none pointer-events-none"
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={(e) => {
                            e.stopPropagation();
                            openFullscreen(enhancedImage, "Enhanced");
                          }}
                          className="absolute top-3 right-3 p-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-white dark:hover:bg-gray-700"
                        >
                          <svg
                            className="w-4 h-4 text-gray-600 dark:text-gray-300"
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
                      <div className="mt-4">
                        <button
                          onClick={() =>
                            handleDownload(enhancedImage, "enhanced-image.jpg")
                          }
                          className="w-full inline-flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 shadow-lg hover:shadow-xl"
                        >
                          <svg
                            className="w-4 h-4 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          Download Enhanced Image
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`border rounded-2xl h-80 flex items-center justify-center transition-colors duration-300 ${
                        darkMode
                          ? "border-gray-600 bg-gray-900"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <div className="text-center text-gray-500 dark:text-gray-400">
                        <svg
                          className="mx-auto h-12 w-12 mb-4"
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
                        <p className="font-medium">
                          Enhanced image will appear here
                        </p>
                        <p className="text-sm">
                          Click "Enhance Image" to process
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons - Inside Compare Results Box */}
              <div className="text-center">
                <div className="inline-flex items-center space-x-4">
                  <button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="inline-flex items-center justify-center px-10 py-4 border border-transparent text-lg font-semibold rounded-xl text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    {isLoading ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-3 h-6 w-6 text-white"
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
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-6 h-6 mr-3"
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
                        <span>Enhance Image</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleReset}
                    className="px-8 py-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-xl transition-all duration-200 shadow-lg"
                  >
                    <svg
                      className="w-5 h-5 mr-3 inline"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
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
            className={`mt-8 rounded-3xl p-8 border transition-colors duration-300 ${
              darkMode
                ? "bg-blue-900/20 border-blue-800"
                : "bg-blue-50 border-blue-100"
            }`}
          >
            <h3 className="text-lg font-semibold mb-4 dark:text-white flex items-center">
              <svg
                className="w-5 h-5 mr-3 text-blue-600"
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
              About Enhanced LIME Algorithm
            </h3>
            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
              This enhanced LIME algorithm uses advanced computer vision
              techniques including multiple illumination estimation methods,
              guided filtering for structure preservation, adaptive gamma
              correction, and image sharpening to produce superior results with
              better realism and detail preservation.
            </p>
          </div>
        </div>
      </main>

      {/* Fullscreen Modal */}
      {fullscreenMode && fullscreenImage && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="relative max-w-7xl max-h-full">
            <div className="absolute top-4 right-4 z-10">
              <button
                onClick={closeFullscreen}
                className="p-3 bg-white/20 backdrop-blur-sm rounded-xl text-white hover:bg-white/30 transition-all duration-200"
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
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="text-center mb-4">
              <h3 className="text-white text-lg font-semibold">
                {fullscreenImage.type} Image
              </h3>
            </div>
            <img
              src={fullscreenImage.src}
              alt={fullscreenImage.type}
              className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
