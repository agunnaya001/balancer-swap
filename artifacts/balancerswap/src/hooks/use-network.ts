import { useState, useEffect } from 'react';
import { CHAIN_ID } from '@/lib/constants';

export function useNetwork() {
  const [chainId, setChainId] = useState<number | null>(null);
  const isCorrectNetwork = chainId === CHAIN_ID;

  useEffect(() => {
    const eth = (window as any).ethereum;
    if (!eth) return;

    const update = async () => {
      try {
        const id = await eth.request({ method: 'eth_chainId' });
        setChainId(parseInt(id, 16));
      } catch {}
    };

    update();
    eth.on?.('chainChanged', (id: string) => setChainId(parseInt(id, 16)));
    return () => eth.removeListener?.('chainChanged', update);
  }, []);

  const switchToSepolia = async () => {
    const eth = (window as any).ethereum;
    if (!eth) return;
    try {
      await eth.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }],
      });
    } catch (e: any) {
      if (e.code === 4902) {
        await eth.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0xaa36a7',
            chainName: 'Sepolia',
            nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
            rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com'],
            blockExplorerUrls: ['https://sepolia.etherscan.io'],
          }],
        });
      }
    }
  };

  return { chainId, isCorrectNetwork, switchToSepolia };
}
