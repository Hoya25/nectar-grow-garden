import { createContext, useContext, useState, ReactNode } from 'react';

interface NCTRContextType {
  balance: number;
  lockedBalance: number;
  setBalance: (n: number) => void;
  setLockedBalance: (n: number) => void;
}

const NCTRContext = createContext<NCTRContextType>({
  balance: 0,
  lockedBalance: 0,
  setBalance: () => {},
  setLockedBalance: () => {},
});

export function NCTRProvider({ children }: { children: ReactNode }) {
  const [balance, setBalance] = useState(0);
  const [lockedBalance, setLockedBalance] = useState(0);

  return (
    <NCTRContext.Provider value={{ balance, lockedBalance, setBalance, setLockedBalance }}>
      {children}
    </NCTRContext.Provider>
  );
}

export function useNCTR() {
  return useContext(NCTRContext);
}
