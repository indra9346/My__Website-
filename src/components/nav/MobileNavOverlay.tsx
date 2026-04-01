import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';

type NavItem = {
  name: string;
  href: string;
};

type SocialLink = {
  href: string;
  icon: ReactNode;
  label: string;
};

type MobileNavOverlayProps = {
  isOpen: boolean;
  activeSection: string;
  navItems: NavItem[];
  socialLinks: SocialLink[];
  onClose: () => void;
  onSectionSelect: (sectionId: string) => void;
};

const MobileNavOverlay = ({
  isOpen,
  activeSection,
  navItems,
  socialLinks,
  onClose,
  onSectionSelect,
}: MobileNavOverlayProps) => {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="nav-mobile-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={onClose}
        >
          <motion.nav
            id="mobile-navigation"
            className="nav-mobile-panel"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            onClick={(event) => event.stopPropagation()}
            aria-label="Mobile navigation"
          >
            <div className="space-y-3">
              {navItems.map((item, index) => {
                const sectionId = item.href.replace('#', '');
                const isActive = activeSection === sectionId;

                return (
                  <motion.button
                    key={item.name}
                    type="button"
                    className={`nav-mobile-link ${isActive ? 'nav-mobile-link-active' : ''}`}
                    onClick={() => onSectionSelect(sectionId)}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ delay: index * 0.04, duration: 0.2 }}
                  >
                    <span>{item.name}</span>
                  </motion.button>
                );
              })}
            </div>

            <div className="grid gap-3 pt-2">
              <a
                href="/resume.pdf"
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                className="nav-cta-secondary"
              >
                View Resume
              </a>
              <a
                href="/resume.pdf"
                download="K_S_Indra_Kumar_Resume.pdf"
                onClick={onClose}
                className="nav-cta-primary"
              >
                Download Resume
              </a>
            </div>

            <div className="flex items-center justify-center gap-4 pt-4">
              {socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target={link.href.startsWith('mailto') ? undefined : '_blank'}
                  rel="noopener noreferrer"
                  aria-label={link.label}
                  className="nav-icon-link"
                >
                  {link.icon}
                </a>
              ))}
            </div>
          </motion.nav>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default MobileNavOverlay;