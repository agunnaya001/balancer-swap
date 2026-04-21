import { useWallet } from './use-wallet';
import { DEX_ABI, ERC20_ABI } from '../lib/constants';
import { useGetDexConfig, useGetPoolStats, useRecordTransaction, getGetPoolStatsQueryKey, getGetTransactionsQueryKey } from '@workspace/api-client-react';
import { ethers, Contract } from 'ethers';
import { useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { useToast } from './use-toast';

export function useDex() {
  const { provider, signer, address } = useWallet();
  const { data: config } = useGetDexConfig();
  const { data: poolStats } = useGetPoolStats();
  const recordTx = useRecordTransaction();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isPending, setIsPending] = useState(false);

  const getContracts = useCallback(() => {
    if (!signer || !config) return null;
    const dex = new Contract(config.dexAddress, DEX_ABI, signer);
    const token = new Contract(config.tokenAddress, ERC20_ABI, signer);
    return { dex, token };
  }, [signer, config]);

  const handleSuccess = async (txResponse: any, type: "swap" | "add_liquidity" | "remove_liquidity", ethAmount: string, tokenAmount: string, lpAmount?: string) => {
    try {
      const receipt = await txResponse.wait();
      await recordTx.mutateAsync({
        data: {
          txHash: receipt.hash,
          type,
          userAddress: address!,
          ethAmount,
          tokenAmount,
          lpAmount,
          blockNumber: receipt.blockNumber
        }
      });
      queryClient.invalidateQueries({ queryKey: getGetPoolStatsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetTransactionsQueryKey() });
      toast({
        title: 'Transaction Successful',
        description: 'Your transaction has been confirmed on the blockchain.',
      });
    } catch (e: any) {
      console.error('Tx confirmation error:', e);
      toast({
        title: 'Transaction Failed',
        description: e.message || 'An error occurred during confirmation.',
        variant: 'destructive'
      });
    }
  };

  const handleError = (e: any) => {
    console.error('Tx error:', e);
    let msg = e.reason || e.message || 'Unknown error occurred';
    if (msg.includes('user rejected')) {
      msg = 'User rejected the transaction';
    }
    toast({
      title: 'Error',
      description: msg,
      variant: 'destructive'
    });
  };

  const swapEthForTokens = async (ethAmount: string, minTokensOut: string) => {
    const contracts = getContracts();
    if (!contracts) return;
    setIsPending(true);
    try {
      const ethWei = ethers.parseEther(ethAmount);
      const minTokensWei = ethers.parseEther(minTokensOut);
      const tx = await contracts.dex.swapEthForTokens(minTokensWei, { value: ethWei });
      await handleSuccess(tx, 'swap', ethWei.toString(), minTokensWei.toString());
    } catch (e: any) {
      handleError(e);
    } finally {
      setIsPending(false);
    }
  };

  const swapTokensForEth = async (tokenAmount: string, minEthOut: string) => {
    const contracts = getContracts();
    if (!contracts) return;
    setIsPending(true);
    try {
      const tokenWei = ethers.parseEther(tokenAmount);
      const minEthWei = ethers.parseEther(minEthOut);
      
      const allowance = await contracts.token.allowance(address, config!.dexAddress);
      if (allowance < tokenWei) {
        const approveTx = await contracts.token.approve(config!.dexAddress, ethers.MaxUint256);
        await approveTx.wait();
      }

      const tx = await contracts.dex.swapTokensForEth(tokenWei, minEthWei);
      await handleSuccess(tx, 'swap', minEthWei.toString(), tokenWei.toString());
    } catch (e: any) {
      handleError(e);
    } finally {
      setIsPending(false);
    }
  };

  const addLiquidity = async (ethAmount: string, tokenAmount: string, minLpOut: string) => {
    const contracts = getContracts();
    if (!contracts) return;
    setIsPending(true);
    try {
      const ethWei = ethers.parseEther(ethAmount);
      const tokenWei = ethers.parseEther(tokenAmount);
      const minLpWei = ethers.parseEther(minLpOut);

      const allowance = await contracts.token.allowance(address, config!.dexAddress);
      if (allowance < tokenWei) {
        const approveTx = await contracts.token.approve(config!.dexAddress, ethers.MaxUint256);
        await approveTx.wait();
      }

      const tx = await contracts.dex.addLiquidity(tokenWei, minLpWei, { value: ethWei });
      await handleSuccess(tx, 'add_liquidity', ethWei.toString(), tokenWei.toString(), minLpWei.toString());
    } catch (e: any) {
      handleError(e);
    } finally {
      setIsPending(false);
    }
  };

  const removeLiquidity = async (lpAmount: string, minEthOut: string, minTokenOut: string) => {
    const contracts = getContracts();
    if (!contracts) return;
    setIsPending(true);
    try {
      const lpWei = ethers.parseEther(lpAmount);
      const minEthWei = ethers.parseEther(minEthOut);
      const minTokenWei = ethers.parseEther(minTokenOut);

      const tx = await contracts.dex.removeLiquidity(lpWei, minEthWei, minTokenWei);
      await handleSuccess(tx, 'remove_liquidity', minEthWei.toString(), minTokenWei.toString(), lpWei.toString());
    } catch (e: any) {
      handleError(e);
    } finally {
      setIsPending(false);
    }
  };

  const getQuote = async (amount: string, isEthIn: boolean) => {
    if (!config || !provider) return "0";
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return "0";
    
    try {
      const dex = new Contract(config.dexAddress, DEX_ABI, provider);
      const weiIn = ethers.parseEther(amount);
      let weiOut;
      if (isEthIn) {
        weiOut = await dex.getEthToTokenPrice(weiIn);
      } else {
        weiOut = await dex.getTokenToEthPrice(weiIn);
      }
      return ethers.formatEther(weiOut);
    } catch (e) {
      console.error("Quote error", e);
      return "0";
    }
  };

  return {
    isPending,
    swapEthForTokens,
    swapTokensForEth,
    addLiquidity,
    removeLiquidity,
    getQuote
  };
}
