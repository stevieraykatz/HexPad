import React from 'react';
import { UI_CONFIG } from './config';

const TopCornerLinks: React.FC = () => {
  const linkStyle = {
    width: '50px',
    height: '50px',
    background: UI_CONFIG.COLORS.OVERLAY_BACKGROUND,
    backdropFilter: UI_CONFIG.BLUR.LIGHT,
    border: `1px solid ${UI_CONFIG.COLORS.BORDER_COLOR}`,
    borderRadius: UI_CONFIG.BORDER_RADIUS.LARGE,
    color: UI_CONFIG.COLORS.TEXT_PRIMARY,
    cursor: 'pointer',
    fontSize: '24px',
    transition: `all ${UI_CONFIG.TRANSITION_DURATION} ${UI_CONFIG.TRANSITION_EASING}`,
    boxShadow: UI_CONFIG.BOX_SHADOW.LIGHT,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textDecoration: 'none'
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.background = UI_CONFIG.COLORS.BUTTON_BACKGROUND;
    e.currentTarget.style.transform = 'scale(1.05)';
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.background = UI_CONFIG.COLORS.OVERLAY_BACKGROUND;
    e.currentTarget.style.transform = 'scale(1)';
  };

  return (
    <div style={{
      position: 'fixed',
      top: UI_CONFIG.SPACING.XLARGE,
      right: UI_CONFIG.SPACING.XLARGE,
      zIndex: UI_CONFIG.Z_INDEX.MENU_TOGGLE,
      display: 'flex',
      gap: UI_CONFIG.SPACING.MEDIUM
    }}>
      {/* GitHub Link */}
      <a
        href="https://github.com/stevieraykatz/HexPad"
        target="_blank"
        rel="noopener noreferrer"
        style={linkStyle}
        title="View on GitHub"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
      </a>

      {/* Discord Link */}
      <a
        href="https://discord.gg/NrVG5CTY87"
        target="_blank"
        rel="noopener noreferrer"
        style={linkStyle}
        title="Join our Discord"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0002 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1568 2.4189Z"/>
        </svg>
      </a>

      {/* Buy Me a Coffee Link */}
      <a
        href="https://coff.ee/katzman"
        target="_blank"
        rel="noopener noreferrer"
        style={linkStyle}
        title="Buy me a coffee"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.216 6.415l-.132-.666c-.119-.598-.388-1.163-.766-1.613a4.44 4.44 0 0 0-1.328-1.072c-.566-.296-1.206-.44-1.907-.44h-9.592c-.7 0-1.34.144-1.906.44a4.44 4.44 0 0 0-1.33 1.072c-.377.45-.646 1.015-.765 1.613L2.357 6.62C1.728 6.89 1.25 7.62 1.25 8.5v3c0 .828.672 1.5 1.5 1.5h.75v7.5c0 .828.672 1.5 1.5 1.5h13c.828 0 1.5-.672 1.5-1.5V13h.75c.828 0 1.5-.672 1.5-1.5v-3c0-.88-.478-1.61-1.084-1.885zM4.5 7.5h15l.25 1.25H4.25L4.5 7.5zm13.5 13h-12V13h12v7.5zM19 11h-.75H4.75H4V9.5h15V11z"/>
        </svg>
      </a>
    </div>
  );
};

export default TopCornerLinks; 