export const handleApiError = (error) => {
  if (!error) {
    return "An unexpected error occurred.";
  }

  if (error.message === "Network Error") {
    return "Network issue: Unable to connect to the server. Please check your internet connection.";
  }

  if (error.response) {
    const status = error.response.status;
    if (status === 404) {
      return "API Error: Resource not found.";
    } else if (status === 403) {
      return "API Error: Access forbidden. Check your permissions or API rate limits.";
    } else if (status === 500) {
      return "API Error: Server error. Please try again later.";
    } else {
      return `API Error: ${error.response.data.message || "An unexpected error occurred."}`;
    }
  }

  return "An unexpected error occurred. Please try again.";
};
