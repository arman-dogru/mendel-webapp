import React from "react";

const Loader = ({ className = "" }) => {
  return (
    <div className={`flex justify-center items-center p-8 ${className}`}>
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-500"></div>
    </div>
  );
};

export default Loader;
