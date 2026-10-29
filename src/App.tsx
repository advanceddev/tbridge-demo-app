import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createTBridge,
  connectWithUi,
  type TBridge,
  type ConnectionStatus,
} from 'tbridge';

const manifestURL = 'https://advanceddev.github.io/tbridge-demo-app/tbridge-manifest.json'

type Locale = 'en' | 'ru';
type Theme = 'dark' | 'light';
type Network = 'mainnet' | 'testnet';

interface Config {
  locale: Locale;
  theme: Theme;
  network: Network;
}

const DEFAULT_CONFIG: Config = {
  locale: 'en',
  theme: 'dark',
  network: 'mainnet',
};

const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  ru: 'Русский',
};

const THEME_LABELS: Record<Theme, string> = {
  dark: 'Dark',
  light: 'Light',
};

export default function TBridgeSmokePage() {
  const bridgeRef = useRef<TBridge | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>({
    status: 'disconnected',
  });
  const [logs, setLogs] = useState<Array<{ time: string; msg: string }>>([]);
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);

  const push = useCallback((msg: string) => {
    const time = new Date().toISOString().slice(11, 19);
    setLogs((prev) => [{ time, msg }, ...prev].slice(0, 50));
  }, []);

  useEffect(() => {
    const bridge = createTBridge({
      manifestUrl: manifestURL,
      network: config.network,
      debug: true,
      allowInsecureManifest: import.meta.env.DEV,
      locale: config.locale,
      theme: config.theme,
    });
    bridgeRef.current = bridge;

    const offStatus = bridge.on('statusChange', (s) => {
      setStatus(s);
      push(`status → ${s.status}`);
    });

    const offHealth = bridge.on('bridgeHealth', (h) => {
      push(`health → ${h}`);
    });

    push(`bridge init (${config.network})`);

    void bridge.restoreConnection().then((ok) => {
      push(ok ? '✓ session restored' : 'no saved session');
    });

    return () => {
      offStatus();
      offHealth();
      bridge.destroy();
      bridgeRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.network]);

  useEffect(() => {
    const bridge = bridgeRef.current;
    if (!bridge) return;
    bridge.setLocale(config.locale);
    bridge.setTheme(config.theme);
  }, [config.locale, config.theme]);

  const connect = useCallback(async () => {
    const bridge = bridgeRef.current;
    if (!bridge) return;

    try {
      push('connecting...');
      await connectWithUi(bridge, {
        locale: config.locale,
        theme: config.theme,
      });
      push('✓ connected');
    } catch (e) {
      push(`✗ ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [push, config.locale, config.theme]);

  const disconnect = useCallback(async () => {
    const bridge = bridgeRef.current;
    if (!bridge) return;

    try {
      await bridge.disconnect();
      push('✓ disconnected');
    } catch (e) {
      push(`✗ ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [push]);

  const sendTransaction = useCallback(async () => {
    const bridge = bridgeRef.current;
    if (!bridge) return;

    try {
      push('sending transaction...');
      await bridge.sendTransaction({
        validUntil: Date.now() + 60_000,
        messages: [
          {
            address: '0QB8YkmJ4Vzdg3H_4Dq30JVWuzwKPvuN0-efocDZPP30B-sc',
            amount: '100000000',
          },
        ],
      });
      push('✓ transaction sent');
    } catch (e) {
      push(`✗ ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [push]);

  const isConnected = status.status === 'connected';
  const isConnecting = status.status === 'connecting';

  const address = useMemo(() => {
    if (isConnected && status.account) {
      const addr = status.account.address;
      return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    }
    return null;
  }, [isConnected, status]);

  const updateConfig = <K extends keyof Config>(key: K, value: Config[K]) => {
    setConfig((prev) => {
      if (prev[key] === value) return prev;

      if (key === 'network') {
        setLogs((l) => [
          { time: new Date().toISOString().slice(11, 19), msg: `switching to ${value}` },
          ...l,
        ]);
        setStatus({ status: 'disconnected' });
      }

      return { ...prev, [key]: value };
    });
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: demoCSS }} />
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>
            <span style={styles.logo}>⚡</span>
            TBridge Demo App
          </h1>
          <p style={styles.subtitle}>Modern TON wallet connection library</p>
        </div>

        {/* Configuration panel */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardTitle}>Configuration</span>
            <span style={styles.cardHint}>Applied live</span>
          </div>

          <div style={styles.configGrid}>
            <label style={styles.field}>
              <span style={styles.fieldLabel}>Network</span>
              <div style={styles.selectWrap}>
                <select
                  value={config.network}
                  onChange={(e) => updateConfig('network', e.target.value as Network)}
                  style={styles.select}
                  className="tbridge-demo-select"
                >
                  <option value="mainnet">🟢 Mainnet</option>
                  <option value="testnet">🟠 Testnet</option>
                </select>
                <span style={styles.selectArrow}>▾</span>
              </div>
            </label>

            <label style={styles.field}>
              <span style={styles.fieldLabel}>Language</span>
              <div style={styles.selectWrap}>
                <select
                  value={config.locale}
                  onChange={(e) => updateConfig('locale', e.target.value as Locale)}
                  style={styles.select}
                  className="tbridge-demo-select"
                >
                  {(Object.keys(LOCALE_LABELS) as Locale[]).map((k) => (
                    <option key={k} value={k}>
                      {LOCALE_LABELS[k]}
                    </option>
                  ))}
                </select>
                <span style={styles.selectArrow}>▾</span>
              </div>
            </label>

            <label style={styles.field}>
              <span style={styles.fieldLabel}>Theme</span>
              <div style={styles.selectWrap}>
                <select
                  value={config.theme}
                  onChange={(e) => updateConfig('theme', e.target.value as Theme)}
                  style={styles.select}
                  className="tbridge-demo-select"
                >
                  {(Object.keys(THEME_LABELS) as Theme[]).map((k) => (
                    <option key={k} value={k}>
                      {THEME_LABELS[k]}
                    </option>
                  ))}
                </select>
                <span style={styles.selectArrow}>▾</span>
              </div>
            </label>
          </div>

          <div style={styles.configMeta}>
            <span style={styles.metaPill}>
              <span style={styles.metaDot} data-network={config.network} />
              {config.network}
            </span>
            <span style={styles.metaPill}>{config.locale.toUpperCase()}</span>
            <span style={styles.metaPill}>{config.theme}</span>
          </div>
        </div>

        {/* Status card */}
        <div style={styles.card}>
          <div style={styles.statusHeader}>
            <div style={styles.statusRow}>
              <span style={styles.label}>Status</span>
              <span
                style={{
                  ...styles.badge,
                  ...styles[`badge_${status.status}` as keyof typeof styles],
                }}
              >
                {status.status}
              </span>
            </div>

            {isConnected && address && (
              <div style={styles.addressRow}>
                <span style={styles.label}>Address</span>
                <code style={styles.address}>{address}</code>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={styles.actions}>
          {!isConnected && !isConnecting && (
            <button
              type="button"
              onClick={() => void connect()}
              className="tbridge-demo-btn tbridge-demo-btn-primary"
            >
              Connect Wallet
            </button>
          )}

          {isConnecting && (
            <button
              type="button"
              disabled
              className="tbridge-demo-button tbridge-demo-button-disabled"
            >
              Connecting...
            </button>
          )}

          {isConnected && (
            <>
              <button
                type="button"
                onClick={() => void sendTransaction()}
                className="tbridge-demo-button tbridge-demo-btn-secondary"
              >
                Send 0.1 GRAM
              </button>

              <button
                type="button"
                onClick={() => void disconnect()}
                className="tbridge-demo-button tbridge-demo-btn-danger"
              >
                Disconnect
              </button>
            </>
          )}
        </div>

        {/* Logs */}
        <div style={styles.logsCard}>
          <div style={styles.logsHeader}>
            <span style={styles.logsTitle}>Activity Log</span>
            {logs.length > 0 && (
              <button
                type="button"
                onClick={() => setLogs([])}
                className="tbridge-demo-clear"
              >
                Clear
              </button>
            )}
          </div>

          <div style={styles.logsContainer}>
            {logs.length === 0 ? (
              <div style={styles.emptyLogs}>No activity yet</div>
            ) : (
              logs.map((log, i) => (
                <div key={`${log.time}-${i}`} style={styles.logEntry}>
                  <span style={styles.logTime}>{log.time}</span>
                  <span style={styles.logMsg}>{log.msg}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={styles.footer}>
          <p style={styles.footerText}>This demo uses TBridge</p>
        </div>
      </div>
    </>
  );
}

const demoCSS = `
.tbridge-demo-select {
  width: 100%;
  padding: 10px 32px 10px 12px;
  font-size: 14px;
  font-weight: 500;
  color: #fafafa;
  background: #27272a;
  border: 1px solid #3f3f46;
  border-radius: 8px;
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
  outline: none;
  font-family: inherit;
}

.tbridge-demo-select:hover {
  border-color: #52525b;
  background: #2f2f33;
}

.tbridge-demo-select:focus {
  border-color: #3b82f6;
}

.tbridge-demo-btn {
  flex: 1;
  min-width: 200px;
  padding: 14px 24px;
  font-size: 15px;
  font-weight: 600;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

.tbridge-demo-btn-primary {
  color: #fff;
  background: #18181b;
  border: 2px solid #3f3f46;
}

.tbridge-demo-btn-primary:hover {
  background: #27272a;
  border-color: #52525b;
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
}

.tbridge-demo-btn-primary:active {
  transform: translateY(0);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.tbridge-demo-btn-secondary {
  color: #fafafa;
  background: #27272a;
  border: 2px solid #3f3f46;
}

.tbridge-demo-btn-secondary:hover {
  background: #3f3f46;
  border-color: #52525b;
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
}

.tbridge-demo-btn-secondary:active {
  transform: translateY(0);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.tbridge-demo-btn-danger {
  color: #fff;
  background: #dc2626;
}

.tbridge-demo-btn-danger:hover {
  background: #ef4444;
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(220, 38, 38, 0.3);
}

.tbridge-demo-btn-danger:active {
  transform: translateY(0);
  box-shadow: 0 4px 8px rgba(220, 38, 38, 0.2);
}

.tbridge-demo-btn-disabled {
  color: #71717a;
  background: #3f3f46;
  cursor: not-allowed;
}

.tbridge-demo-clear {
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  color: #a1a1aa;
  background: transparent;
  border: 1px solid #3f3f46;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

.tbridge-demo-clear:hover {
  color: #fafafa;
  background: #3f3f46;
  border-color: #52525b;
}
`;

const styles = {
  container: {
    minHeight: '100vh',
    padding: '40px 20px',
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    color: '#fafafa',
  },

  header: {
    maxWidth: 640,
    margin: '0 auto 32px',
    textAlign: 'center' as const,
  },

  title: {
    fontSize: 24,
    fontWeight: 700,
    margin: '0 0 8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    color: '#fafafa',
  },

  logo: {
    fontSize: 42,
  },

  subtitle: {
    fontSize: 16,
    color: '#a1a1aa',
    margin: 0,
  },

  card: {
    maxWidth: 640,
    margin: '0 auto 24px',
    background: '#27272a',
    borderRadius: 16,
    padding: 24,
    border: '1px solid #3f3f46',
  },

  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#fafafa',
  },

  cardHint: {
    fontSize: 12,
    color: '#a1a1aa',
    padding: '4px 10px',
    background: '#3f3f46',
    borderRadius: 999,
    fontWeight: 500,
  },

  configGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 12,
  },

  field: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
  },

  fieldLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: '#a1a1aa',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },

  selectWrap: {
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
  },

  select: {},

  selectArrow: {
    position: 'absolute' as const,
    right: 12,
    color: '#a1a1aa',
    pointerEvents: 'none' as const,
    fontSize: 12,
  },

  configMeta: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 8,
    marginTop: 16,
    paddingTop: 16,
    borderTop: '1px solid #3f3f46',
  },

  metaPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px',
    background: '#3f3f46',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 500,
    color: '#a1a1aa',
    fontFamily: 'ui-monospace, "Cascadia Code", monospace',
  },

  metaDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#71717a',
  },

  statusHeader: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 12,
  },

  statusRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  label: {
    fontSize: 14,
    fontWeight: 600,
    color: '#a1a1aa',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },

  badge: {
    padding: '6px 12px',
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
  },

  badge_disconnected: {
    background: 'rgba(220, 38, 38, 0.2)',
    color: '#f87171',
  },

  badge_connecting: {
    background: 'rgba(217, 119, 6, 0.2)',
    color: '#fbbf24',
  },

  badge_connected: {
    background: 'rgba(22, 163, 74, 0.2)',
    color: '#4ade80',
  },

  addressRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTop: '1px solid #3f3f46',
  },

  address: {
    fontFamily: 'ui-monospace, "Cascadia Code", monospace',
    fontSize: 14,
    color: '#fafafa',
    background: '#3f3f46',
    padding: '4px 8px',
    borderRadius: 6,
  },

  actions: {
    maxWidth: 640,
    margin: '0 auto 24px',
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap' as const,
  },

  logsCard: {
    maxWidth: 640,
    margin: '0 auto 24px',
    background: '#18181b',
    borderRadius: 16,
    overflow: 'hidden',
    border: '1px solid #27272a',
  },

  logsHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    background: '#27272a',
    borderBottom: '1px solid #3f3f46',
  },

  logsTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#fafafa',
  },

  logsContainer: {
    maxHeight: 400,
    overflow: 'auto',
    padding: '12px 0',
  },

  emptyLogs: {
    padding: '32px 20px',
    textAlign: 'center' as const,
    color: '#71717a',
    fontSize: 14,
  },

  logEntry: {
    display: 'flex',
    gap: 12,
    padding: '8px 20px',
    fontFamily: 'ui-monospace, "Cascadia Code", monospace',
    fontSize: 13,
    lineHeight: 1.5,
  },

  logTime: {
    color: '#71717a',
    flexShrink: 0,
  },

  logMsg: {
    color: '#a1ff9f',
    wordBreak: 'break-word' as const,
  },

  footer: {
    maxWidth: 640,
    margin: '0 auto',
    textAlign: 'center' as const,
  },

  footerText: {
    fontSize: 13,
    color: '#71717a',
    margin: 0,
  },
} as const;