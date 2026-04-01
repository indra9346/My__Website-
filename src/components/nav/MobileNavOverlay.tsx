import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Home, User, Briefcase, Zap, Mail, FileText, Download, ChevronRight } from 'lucide-react';

const sectionIcons: Record<string, ReactNode> = {
  home: <Home size={20} />,
  about: <User size={20} />,
  projects: <Briefcase size={20} />,
  skills: <Zap size={20} />,
  contact: <Mail size={20} />,
};

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
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          onClick={onClose}
        >
          <motion.nav
            id="mobile-navigation"
            className="nav-mobile-panel"
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.96 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            onClick={(event) => event.stopPropagation()}
            aria-label="Mobile navigation"
          >
            {/* Section label */}
            <motion.p
              className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground/60 px-2 mb-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              Navigation
            </motion.p>

            <div className="space-y-2">
              {navItems.map((item, index) => {
                const sectionId = item.href.replace('#', '');
                const isActive = activeSection === sectionId;
                const icon = sectionIcons[sectionId];

                return (
                  <motion.button
                    key={item.name}
                    type="button"
                    className={`nav-mobile-link ${isActive ? 'nav-mobile-link-active' : ''}`}
                    onClick={() => onSectionSelect(sectionId)}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{
                      delay: 0.06 + index * 0.05,
                      duration: 0.28,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`nav-mobile-icon ${isActive ? 'nav-mobile-icon-active' : ''}`}>
                        {icon}
                      </span>
                      <span>{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isActive && (
                        <motion.span
                          className="nav-mobile-dot"
                          layoutId="nav-active-dot"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                      <ChevronRight size={16} className="text-muted-foreground/40" />
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Resume CTAs */}
            <motion.div
              className="grid gap-3 pt-4"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.28 }}
            >
              <a
                href="/resume.pdf"
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                className="nav-cta-secondary"
              >
                <FileText size={16} className="mr-2" />
                View Resume
              </a>
              <a
                href="/resume.pdf"
                download="K_S_Indra_Kumar_Resume.pdf"
                onClick={onClose}
                className="nav-cta-primary"
              >
                <Download size={16} className="mr-2" />
                Download Resume
              </a>
            </motion.div>

            {/* Social links */}
            <motion.div
              className="flex items-center justify-center gap-4 pt-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.42 }}
            >
              {socialLinks.map((link) => (
                <motion.a
                  key={link.label}
                  href={link.href}
                  target={link.href.startsWith('mailto') ? undefined : '_blank'}
                  rel="noopener noreferrer"
                  aria-label={link.label}
                  className="nav-icon-link"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.92 }}
                >
                  {link.icon}
                </motion.a>
              ))}
            </motion.div>
          </motion.nav>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default MobileNavOverlay;
