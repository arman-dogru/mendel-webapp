import { createContext, useContext, useState } from "react";

const RepoContext = createContext();

export const RepoProvider = ({ children }) => {
  const [selectedRepo, setSelectedRepo] = useState(null);

  return (
    <RepoContext.Provider value={{ selectedRepo, setSelectedRepo }}>
      {children}
    </RepoContext.Provider>
  );
};

export const useRepo = () => {
  const context = useContext(RepoContext);
  if (!context) {
    throw new Error("useRepo must be used within a RepoProvider");
  }
  return context;
};
