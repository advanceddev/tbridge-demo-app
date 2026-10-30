import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createTBridge,
  connectWithUi,
  openWalletLink,
  type TBridge,
  type ConnectionStatus,
  type SendTransactionRequest,
} from '@tbridge/sdk';

export interface UseTBridgeOptions {
  manifestUrl: string;
  network?: 'mainnet' | 'testnet';
  locale?: 'en' | 'ru';
  theme?: 'dark' | 'light';
  debug?: boolean;
  allowInsecureManifest?: boolean;
  onStatusChange?: (status: ConnectionStatus) => void;
}

export interface UseTBridgeReturn {
  getBridge: () => TBridge | null;
  status: ConnectionStatus;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  sendTransaction: (request: SendTransactionRequest) => Promise<{ boc: string }>;
  setLocale: (locale: 'en' | 'ru') => void;
  setTheme: (theme: 'dark' | 'light') => void;
}

export function useTBridge(options: UseTBridgeOptions): UseTBridgeReturn {
  const bridgeRef = useRef<TBridge | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>({ status: 'disconnected' });
  
  const onStatusChangeRef = useRef(options.onStatusChange);
  useEffect(() => {
    onStatusChangeRef.current = options.onStatusChange;
  }, [options.onStatusChange]);

  useEffect(() => {
    const bridge = createTBridge({
      manifestUrl: options.manifestUrl,
      network: options.network || 'mainnet',
      debug: options.debug ?? false,
      allowInsecureManifest: options.allowInsecureManifest ?? false,
      locale: options.locale || 'en',
      theme: options.theme || 'dark',
    });
    
    bridgeRef.current = bridge;

    const offStatus = bridge.on('statusChange', (s) => {
      setStatus(s);
      onStatusChangeRef.current?.(s);
    });

    void bridge.restoreConnection().catch((err) => {
      console.warn('[TBridge] Session restore failed:', err);
    });

    return () => {
      offStatus();
      bridge.destroy();
      bridgeRef.current = null;
      setStatus({ status: 'disconnected' });
    };
  }, [options]);

  useEffect(() => {
    if (bridgeRef.current && options.locale) {
      bridgeRef.current.setLocale(options.locale);
    }
  }, [options.locale]);

  useEffect(() => {
    if (bridgeRef.current && options.theme) {
      bridgeRef.current.setTheme(options.theme);
    }
  }, [options.theme]);

  const connect = useCallback(async () => {
    const bridge = bridgeRef.current;
    if (!bridge) throw new Error('TBridge instance is not initialized');

    await connectWithUi(bridge, {
      locale: options.locale || 'en',
      theme: options.theme || 'dark',
      openLink: (link, wallet) => {
        openWalletLink(link, {
          deepLink: wallet.deepLink,
          target: '_self',
        });
      },
    });
  }, [options.locale, options.theme]);

  const disconnect = useCallback(async () => {
    const bridge = bridgeRef.current;
    if (!bridge) return;
    await bridge.disconnect();
  }, []);

  const sendTransaction = useCallback(async (request: SendTransactionRequest) => {
    const bridge = bridgeRef.current;
    if (!bridge) throw new Error('TBridge instance is not initialized');
    return bridge.sendTransaction(request);
  }, []);

  const setLocale = useCallback((locale: 'en' | 'ru') => {
    bridgeRef.current?.setLocale(locale);
  }, []);

  const setTheme = useCallback((theme: 'dark' | 'light') => {
    bridgeRef.current?.setTheme(theme);
  }, []);

  return useMemo(() => ({
    getBridge: () => bridgeRef.current,
    status,
    isConnected: status.status === 'connected',
    isConnecting: status.status === 'connecting',
    connect,
    disconnect,
    sendTransaction,
    setLocale,
    setTheme,
  }), [status, connect, disconnect, sendTransaction, setLocale, setTheme]);
}