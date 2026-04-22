import { useState, useEffect, useCallback } from 'react';
import { ethers, Contract } from 'ethers';
import { useWallet } from './use-wallet';
import { useGetDexConfig } from '@workspace/api-client-react';
import { ERC20_ABI, DEX_ABI } from '@/lib/constants';

export interface Balances {
  eth: string;
  token: string;
  lp: string;
  isLoading: boolean;
}

export function useBalances(): Balances & { refetch: () => void } {
  const { provider, address } = useWallet();
  const { data: config } = useGetDexConfig();
  const [balances, setBalances] = useState<Balances>({ eth: '0', token: '0', lp: '0', isLoading: false });

  const fetch = useCallback(async () => {
    if (!provider || !address || !config?.tokenAddress || !config?.dexAddress) {
      setBalances({ eth: '0', token: '0', lp: '0', isLoading: false });
      return;
    }
    setBalances(b => ({ ...b, isLoading: true }));
    try {
      const [ethBal, tokenBal, lpBal] = await Promise.all([
        provider.getBalance(address),
        new Contract(config.tokenAddress, ERC20_ABI, provider).balanceOf(address),
        new Contract(config.dexAddress, DEX_ABI, provider).balanceOf(address),
      ]);
      setBalances({
        eth: ethers.formatEther(ethBal),
        token: ethers.formatEther(tokenBal),
        lp: ethers.formatEther(lpBal),
        isLoading: false,
      });
    } catch (e) {
      console.error('Balance fetch error', e);
      setBalances(b => ({ ...b, isLoading: false }));
    }
  }, [provider, address, config?.tokenAddress, config?.dexAddress]);

  useEffect(() => {
    fetch();
    if (!provider || !address) return;
    const interval = setInterval(fetch, 15000);
    return () => clearInterval(interval);
  }, [fetch, provider, address]);

  return { ...balances, refetch: fetch };
}
