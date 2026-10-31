import { useCallback, useState } from 'react';
import { useTBridge, type UseTBridgeOptions } from './hooks/useTBridge';
import { type ConnectionStatus } from '@tbridge/sdk';

const manifestURL = 'https://advanceddev.github.io/tbridge-demo-app/tbridge-manifest.json';

type Locale = 'en' | 'ru';
type Theme = 'dark' | 'light';
type Network = 'mainnet' | 'testnet';

const DEFAULT_CONFIG: UseTBridgeOptions = {
  manifestUrl: manifestURL,
  network: 'mainnet',
  locale: 'en',
  theme: 'dark',
  debug: import.meta.env.DEV,
  allowInsecureManifest: import.meta.env.DEV,
};

const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  ru: 'Русский',
};

const THEME_LABELS: Record<Theme, string> = {
  dark: 'Dark',
  light: 'Light',
};

const isValidTonAddress = (address: string): boolean => {
  return /^(0|[UEkQ])[a-zA-Z0-9_-]{47}$/.test(address.trim());
};

const DEFAULT_ADDRESSES: Record<Network, string> = {
  mainnet: 'UQD0UzzvZ5dgtcLVPBHMnTibhMrzLvihBIwUZFp_EBqEucjB',
  testnet: '0QB8YkmJ4Vzdg3H_4Dq30JVWuzwKPvuN0-efocDZPP30B-sc',
};

export default function TBridgeSmokePage() {
  const [logs, setLogs] = useState<Array<{ time: string; msg: string }>>([]);
  const [config, setConfig] = useState<UseTBridgeOptions>(DEFAULT_CONFIG);
  const [recipientAddress, setRecipientAddress] = useState<string>(
    DEFAULT_ADDRESSES[DEFAULT_CONFIG.network as Network]
  );

  const push = useCallback((msg: string) => {
    const time = new Date().toISOString().slice(11, 19);
    setLogs((prev) => [{ time, msg }, ...prev].slice(0, 50));
  }, []);

  const handleStatusChange = useCallback((status: ConnectionStatus) => {
    if (status.status === 'connected') {
      const addr = status.account.address;
      const shortAddr = `${addr.slice(0, 6)}...${addr.slice(-4)}`;
      push(`✓ connected wallet: ${shortAddr}`);
    }
  }, [push]);

  const {
    status,
    isConnected,
    isConnecting,
    connect: hookConnect,
    disconnect: hookDisconnect,
    sendTransaction: hookSendTransaction,
  } = useTBridge({
    ...config,
    onStatusChange: handleStatusChange,
  });

  const updateConfig = <K extends keyof UseTBridgeOptions>(key: K, value: UseTBridgeOptions[K]) => {
    if (config[key] === value) return;

    if (key === 'network') {
      const newNetwork = value as Network;
      setRecipientAddress(DEFAULT_ADDRESSES[newNetwork]);
      const time = new Date().toISOString().slice(11, 19);
      setLogs((l) => [{ time, msg: `switching to ${newNetwork}` }, ...l].slice(0, 50));
    }
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const connect = useCallback(async () => {
    try {
      push('connecting...');
      await hookConnect();
    } catch (e) {
      push(`✗ ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [hookConnect, push]);

  const disconnect = useCallback(async () => {
    try {
      await hookDisconnect();
      push('✓ disconnected');
    } catch (e) {
      push(`✗ ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [hookDisconnect, push]);

  const sendTransaction = useCallback(async () => {
    if (!isValidTonAddress(recipientAddress)) return;

    try {
      push(`sending 0.1 GRAM to ${recipientAddress.slice(0, 6)}...`);
      await hookSendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [
          {
            address: recipientAddress,
            amount: '100000000', // 0.1 GRAM in nanotons
          },
        ],
      });
      push('✓ transaction sent');
    } catch (e) {
      push(`✗ ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [hookSendTransaction, recipientAddress, push]);

  const isAddressValid = isValidTonAddress(recipientAddress);

  return (
    <div className="tbridge-gram-theme">
      <style dangerouslySetInnerHTML={{ __html: gramDarkCSS }} />
      <div style={styles.container}>
        
        <div style={styles.header}>
          <h1 style={styles.title}>
            <span style={styles.logo}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="48" height="48" aria-hidden="true" focusable="false"><path d="M7 23 V13 C7 9.5 10.5 7.5 16 7.5 C21.5 7.5 25 9.5 25 13 V23 H22 V13.2 C22 11.2 19.5 10 16 10 C12.5 10 10 11.2 10 13.2 V23 H7 Z" fill="#0098EA"/><circle cx="16" cy="14.5" r="2.5" fill="#0098EA"/></svg>
            </span>
            TBridge
          </h1>
          <p style={styles.subtitle}>Modern TON wallet connection library.</p>

          <div style={styles.linksRow}>
          <a 
              href="https://www.npmjs.com/package/@tbridge/sdk" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="tbridge-link tbridge-link--active"
            >
              NPMJS ↗
            </a>
            <span className="tbridge-divider">•</span>
            <a 
              href="https://github.com/advanceddev/tbridge-sdk" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="tbridge-link tbridge-link--active"
            >
              GITHUB ↗
            </a>
            <span className="tbridge-divider">•</span>
            <a 
              href="https://telegram.me/frntbck" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="tbridge-link tbridge-link--active"
            >
              TELEGRAM ↗
            </a>
          </div>
        </div>

        <div className="tbridge-card">
          <div style={styles.cardHeader}>
            <span style={styles.cardTitle}>Configuration</span>
            <span className={`tbridge-badge tbridge-badge--${status.status}`}>
              {status.status}
            </span>
          </div>

          <div style={styles.configGrid}>
            <label style={styles.field}>
              <span style={styles.fieldLabel}>Network</span>
              <div style={styles.selectWrap}>
                <select
                  value={config.network}
                  onChange={(e) => updateConfig('network', e.target.value as Network)}
                  className="tbridge-select"
                >
                  <option value="mainnet">Mainnet</option>
                  <option value="testnet">Testnet</option>
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
                  className="tbridge-select"
                >
                  {(Object.keys(LOCALE_LABELS) as Locale[]).map((k) => (
                    <option key={k} value={k}>{LOCALE_LABELS[k]}</option>
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
                  className="tbridge-select"
                >
                  {(Object.keys(THEME_LABELS) as Theme[]).map((k) => (
                    <option key={k} value={k}>{THEME_LABELS[k]}</option>
                  ))}
                </select>
                <span style={styles.selectArrow}>▾</span>
              </div>
            </label>
          </div>
        </div>

        <div style={styles.actionsContainer}>
          {!isConnected && !isConnecting && (
            <button
              type="button"
              onClick={() => void connect()}
              className="tbridge-btn tbridge-btn--primary tbridge-btn--full"
            >
              Connect Wallet
            </button>
          )}

          {isConnecting && (
            <button type="button" disabled className="tbridge-btn tbridge-btn--disabled tbridge-btn--full">
              <span className="tbridge-spinner" />
              Connecting...
            </button>
          )}

          {isConnected && (
            <div style={styles.connectedActions}>
              <div style={styles.inputGroup}>
                <label style={styles.fieldLabel}>Recipient Address</label>
                <input
                  type="text"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  className={`tbridge-input ${!isAddressValid && recipientAddress.length > 0 ? 'tbridge-input--invalid' : ''}`}
                  placeholder="Enter TON address"
                  spellCheck={false}
                />
                {!isAddressValid && recipientAddress.length > 0 && (
                  <span style={styles.validationMsg}>Invalid TON address format</span>
                )}
              </div>

              <div className="tbridge-button-row">
                <button
                  type="button"
                  onClick={() => void sendTransaction()}
                  disabled={!isAddressValid}
                  className="tbridge-btn tbridge-btn--primary"
                >
                  Send 0.1 GRAM
                </button>
                <button
                  type="button"
                  onClick={() => void disconnect()}
                  className="tbridge-btn tbridge-btn--danger"
                >
                  Disconnect
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="tbridge-card tbridge-card--logs">
          <div style={styles.logsHeader}>
            <span style={styles.logsTitle}>Activity Log</span>
            {logs.length > 0 && (
              <button
                type="button"
                onClick={() => setLogs([])}
                className="tbridge-btn tbridge-btn--ghost"
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
                <div key={`${log.time}-${i}`} className="tbridge-log-entry">
                  <span className="tbridge-log-time">{log.time}</span>
                  <span className="tbridge-log-msg">{log.msg}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={styles.footer}>
          <p style={styles.footerText}>Powered by TBridge • for TON Ecosystem with 💎</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TBridge Design System — Dark Theme
// Same visual language as the TBridge widget:
//   - TON brand blue with gradients and soft glows
//   - Telegram-style spring easings (transform/opacity only = GPU compositing)
//   - @supports(backdrop-filter, color-mix) for progressive enhancement
//   - prefers-reduced-motion respected
// ============================================================================
const gramDarkCSS = `
.tbridge-gram-theme {
  --bg-primary: #131418;
  --bg-secondary: #1c1e25;
  --bg-tertiary: #21242b;
  --bg-hover: #2a2d36;

  --accent-primary: #0098ea;
  --accent-strong: #16a5f0;
  --accent-glow: rgba(0, 152, 234, 0.28);
  --accent-glow-strong: rgba(0, 152, 234, 0.42);

  --text-primary: #f5f6f8;
  --text-secondary: #9ba1ad;
  --text-muted: #6b7180;

  --border-default: rgba(255, 255, 255, 0.08);
  --border-strong: rgba(255, 255, 255, 0.14);
  --border-focus: rgba(0, 152, 234, 0.55);
  --border-invalid: rgba(255, 107, 107, 0.55);

  --success: #4ade80;
  --success-glow: rgba(74, 222, 128, 0.22);
  --warning: #fbbf24;
  --warning-glow: rgba(251, 191, 36, 0.22);
  --danger: #ff6b6b;
  --danger-glow: rgba(255, 107, 107, 0.22);

  --shadow-card: 0 24px 60px -24px rgba(0, 0, 0, 0.55), 0 10px 24px -14px rgba(0, 0, 0, 0.35);
  --shadow-input: 0 2px 8px -3px rgba(0, 0, 0, 0.35);
  --shadow-btn-primary: 0 8px 22px -8px rgba(0, 152, 234, 0.55);
  --shadow-btn-danger: 0 6px 18px -10px rgba(255, 107, 107, 0.4);

  font-family: 'Inter', system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  color: var(--text-primary);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.tbridge-gram-theme ::selection {
  background: var(--accent-glow);
}

.tbridge-gram-theme * { box-sizing: border-box; }

/* ——— Cards ——— */
.tbridge-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-default);
  border-radius: 22px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: var(--shadow-card), inset 0 1px 0 rgba(255, 255, 255, 0.045);
  transition: border-color 0.2s ease, box-shadow 0.25s ease;
}

.tbridge-card--logs {
  background: var(--bg-primary);
  padding: 0;
  overflow: hidden;
  box-shadow: var(--shadow-card);
}

/* ——— Badges ——— */
.tbridge-badge {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  line-height: 1;
  transition: transform 0.24s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.tbridge-badge:hover { transform: scale(1.04); }

.tbridge-badge--disconnected {
  background: rgba(255, 107, 107, 0.12);
  color: var(--danger);
  border: 1px solid rgba(255, 107, 107, 0.25);
  box-shadow: 0 0 0 1px rgba(255, 107, 107, 0.08);
}
.tbridge-badge--connecting {
  background: rgba(251, 191, 36, 0.12);
  color: var(--warning);
  border: 1px solid rgba(251, 191, 36, 0.25);
  box-shadow: 0 0 0 1px rgba(251, 191, 36, 0.08);
}
.tbridge-badge--connected {
  background: rgba(74, 222, 128, 0.12);
  color: var(--success);
  border: 1px solid rgba(74, 222, 128, 0.28);
  box-shadow: 0 0 12px var(--success-glow);
}

/* ——— Links ——— */
.tbridge-link {
  color: var(--text-muted);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: default;
  font-weight: 600;
  letter-spacing: 0.02em;
  transition: color 0.18s ease, transform 0.24s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.tbridge-link--active { color: var(--accent-primary); cursor: pointer; }
.tbridge-link--active:hover {
  color: var(--accent-strong);
  transform: translateY(-1px);
  text-decoration: none;
}
.tbridge-link--soon { opacity: 0.45; }
.tbridge-soon-tag {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  color: var(--text-muted);
  background: var(--bg-tertiary);
  padding: 1px 5px;
  border-radius: 5px;
  border: 1px solid var(--border-default);
}
.tbridge-divider { color: var(--bg-tertiary); user-select: none; }

/* ——— Form elements ——— */
.tbridge-select,
.tbridge-input {
  width: 100%;
  padding: 11px 36px 11px 14px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  background: var(--bg-tertiary);
  border: 1px solid var(--border-default);
  border-radius: 12px;
  appearance: none;
  cursor: pointer;
  outline: none;
  font-family: inherit;
  box-shadow: var(--shadow-input), inset 0 1px 0 rgba(255, 255, 255, 0.02);
  transition:
    background 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.tbridge-input {
  font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
  font-size: 12px;
  letter-spacing: 0.02em;
  cursor: text;
}

.tbridge-select:hover,
.tbridge-input:hover {
  background: var(--bg-hover);
  border-color: var(--border-strong);
}

.tbridge-select:focus,
.tbridge-input:focus {
  background: var(--bg-hover);
  border-color: var(--border-focus);
  box-shadow: 0 0 0 3px var(--accent-glow), var(--shadow-input);
}

.tbridge-input--invalid {
  border-color: var(--border-invalid) !important;
  box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.18), var(--shadow-input) !important;
  background: rgba(255, 107, 107, 0.04);
}

/* ——— Button row (responsive) ——— */
.tbridge-button-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.tbridge-button-row .tbridge-btn {
  flex: 1;
  min-width: 0;
}
@media (max-width: 640px) {
  .tbridge-button-row { flex-direction: column; }
  .tbridge-button-row .tbridge-btn { width: 100%; }
}

/* ——— Buttons ——— */
.tbridge-btn {
  padding: 14px 22px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.01em;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-family: inherit;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition:
    filter 0.15s ease,
    opacity 0.15s ease,
    box-shadow 0.22s ease,
    transform 0.26s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.tbridge-btn--full { width: 100%; }

.tbridge-btn--primary {
  color: #fff;
  background: linear-gradient(135deg, #2cb2f5 0%, #0098ea 52%, #0082cf 100%);
  box-shadow: var(--shadow-btn-primary), inset 0 1px 0 rgba(255, 255, 255, 0.22);
}
.tbridge-btn--primary:hover:not(:disabled) {
  filter: brightness(1.07);
  transform: translateY(-2px);
  box-shadow: 0 12px 28px -10px rgba(0, 152, 234, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.25);
}
.tbridge-btn--primary:active:not(:disabled) {
  transform: translateY(0) scale(0.985);
}
.tbridge-btn--primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
  filter: grayscale(0.2);
}
.tbridge-btn--primary:focus-visible {
  outline: none;
  box-shadow: var(--shadow-btn-primary), 0 0 0 2px var(--bg-primary), 0 0 0 4px var(--accent-primary);
}

.tbridge-btn--danger {
  color: var(--danger);
  background: rgba(255, 107, 107, 0.08);
  border: 1px solid rgba(255, 107, 107, 0.22);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
}
.tbridge-btn--danger:hover {
  background: rgba(255, 107, 107, 0.16);
  border-color: var(--danger);
  transform: translateY(-2px);
  box-shadow: var(--shadow-btn-danger);
}
.tbridge-btn--danger:active { transform: translateY(0) scale(0.985); }
.tbridge-btn--danger:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--bg-primary), 0 0 0 4px var(--danger);
}

.tbridge-btn--ghost {
  padding: 6px 12px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted);
  background: transparent;
  border: 1px solid var(--border-default);
  border-radius: 999px;
  flex-shrink: 0;
  width: auto;
  transition:
    color 0.18s ease,
    background 0.18s ease,
    border-color 0.18s ease,
    transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.tbridge-btn--ghost:hover {
  color: var(--text-primary);
  background: var(--bg-tertiary);
  border-color: var(--border-strong);
}
.tbridge-btn--ghost:active { transform: scale(0.94); }

.tbridge-btn--disabled {
  color: var(--text-muted);
  background: var(--bg-tertiary);
  border: 1px solid var(--border-default);
  cursor: not-allowed;
  box-shadow: none;
}

/* ——— Spinner ——— */
.tbridge-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.14);
  border-top-color: var(--accent-strong);
  border-radius: 50%;
  animation: tbridge-spin 0.7s linear infinite;
}
@keyframes tbridge-spin { to { transform: rotate(360deg); } }

/* ——— Logs ——— */
.tbridge-log-entry {
  display: flex;
  gap: 16px;
  padding: 9px 20px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 12px;
  line-height: 1.55;
  border-bottom: 1px solid var(--border-default);
  transition: background 0.18s ease;
}
.tbridge-log-entry:last-child { border-bottom: none; }
.tbridge-log-entry:hover { background: var(--bg-secondary); }
.tbridge-log-time {
  color: var(--text-muted);
  flex-shrink: 0;
  user-select: none;
  font-variant-numeric: tabular-nums;
}
.tbridge-log-msg {
  color: var(--text-secondary);
  word-break: break-all;
}

/* Scrollbar */
.tbridge-gram-theme ::-webkit-scrollbar { width: 6px; height: 6px; }
.tbridge-gram-theme ::-webkit-scrollbar-track { background: transparent; }
.tbridge-gram-theme ::-webkit-scrollbar-thumb {
  background: var(--bg-tertiary);
  border-radius: 3px;
  transition: background 0.2s ease;
}
.tbridge-gram-theme ::-webkit-scrollbar-thumb:hover { background: var(--bg-hover); }

/* ——— Accessibility: prefers-reduced-motion ——— */
@media (prefers-reduced-motion: reduce) {
  .tbridge-gram-theme *,
  .tbridge-gram-theme *::before,
  .tbridge-gram-theme *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
  }
}
`;

// ============================================================================
// Layout Styles (unchanged)
// ============================================================================
const styles = {
  container: {
    minHeight: '100vh',
    padding: '40px 16px',
    maxWidth: '640px',
    margin: '0 auto',
  } as React.CSSProperties,

  header: {
    textAlign: 'center' as const,
    marginBottom: '32px',
  } as React.CSSProperties,

  title: {
    fontSize: '28px',
    fontWeight: 800,
    margin: '0 0 8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    letterSpacing: '-0.02em',
    background: 'linear-gradient(135deg, #FFFFFF 0%, #94A3B8 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  } as React.CSSProperties,

  logo: {
    fontSize: '32px',
    WebkitTextFillColor: 'initial',
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } as React.CSSProperties,

  subtitle: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    margin: 0,
    fontWeight: 400,
  } as React.CSSProperties,

  linksRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginTop: '16px',
    fontSize: '12px',
    fontWeight: 500,
  } as React.CSSProperties,

  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  } as React.CSSProperties,

  cardTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.01em',
  } as React.CSSProperties,

  configGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: '12px',
  } as React.CSSProperties,

  field: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  } as React.CSSProperties,

  fieldLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
  } as React.CSSProperties,

  selectWrap: {
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
  } as React.CSSProperties,

  selectArrow: {
    position: 'absolute' as const,
    right: '12px',
    color: 'var(--text-muted)',
    pointerEvents: 'none' as const,
    fontSize: '10px',
  } as React.CSSProperties,

  actionsContainer: {
    marginBottom: '20px',
  } as React.CSSProperties,

  connectedActions: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  } as React.CSSProperties,

  inputGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  } as React.CSSProperties,

  validationMsg: {
    fontSize: '11px',
    color: 'var(--danger)',
    fontWeight: 500,
    marginTop: '2px',
  } as React.CSSProperties,

  buttonRow: {
    display: 'flex',
    gap: '12px',
  } as React.CSSProperties,

  logsHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 20px',
    background: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border-default)',
  } as React.CSSProperties,

  logsTitle: {
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
  } as React.CSSProperties,

  logsContainer: {
    maxHeight: '320px',
    overflowY: 'auto' as const,
    padding: '8px 0',
  } as React.CSSProperties,

  emptyLogs: {
    padding: '32px 20px',
    textAlign: 'center' as const,
    color: 'var(--text-muted)',
    fontSize: '13px',
  } as React.CSSProperties,

  footer: {
    textAlign: 'center' as const,
    marginTop: '40px',
  } as React.CSSProperties,

  footerText: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    margin: 0,
    fontWeight: 500,
  } as React.CSSProperties,
} as const;