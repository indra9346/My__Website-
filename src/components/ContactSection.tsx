import { Mail, MapPin, Phone, Send, CheckCircle } from 'lucide-react';
import { useState, useRef } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';

const ContactSection = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const formspreeEndpoint = 'https://formspree.io/f/xeolppkl';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setStatusMessage("Sending message...");

    try {
      const response = await fetch(formspreeEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });

      if (response.ok) {
        setIsSuccess(true);
        setStatusMessage('Message sent successfully! I will get back to you soon.');
        setName('');
        setEmail('');
        setMessage('');
        setTimeout(() => setIsSuccess(false), 3000);
      } else {
        setStatusMessage('An error occurred. Please try again or contact me directly via email.');
      }
    } catch {
      setStatusMessage('An error occurred. Please try again or contact me directly via email.');
    }

    setIsSending(false);
    setTimeout(() => setStatusMessage(''), 5000);
  };

  const inputClass =
    'w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white transition-all duration-300 focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_15px_rgba(3,233,244,0.15)] placeholder:text-gray-500';

  return (
    <section id="contact" className="py-24 bg-black/30" ref={ref}>
      <div className="container mx-auto px-4">
        <motion.h2
          className="section-title"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          Contact Me
        </motion.h2>
        <motion.p
          className="text-gray-300 mb-12 max-w-2xl"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          I'm actively seeking <strong>internship opportunities</strong> and <strong>full-time roles</strong> as a fresh graduate. Let's connect and build something great together!
        </motion.p>

        <div className="flex flex-col md:flex-row gap-10">
          {/* Contact info */}
          <motion.div
            className="md:w-1/3"
            initial={{ opacity: 0, x: -40 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7 }}
          >
            <div className="space-y-8">
              {[
                { icon: Mail, label: 'Email', value: 'ik9893344@gmail.com' },
                { icon: MapPin, label: 'Location', value: 'Bengaluru, Karnataka, India' },
                { icon: Phone, label: 'Phone', value: '+91 9346476951' },
              ].map((item, i) => (
                <motion.div
                  key={item.label}
                  className="flex items-start group"
                  initial={{ opacity: 0, x: -20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.2 + i * 0.1, duration: 0.5 }}
                >
                  <item.icon className="text-neon-cyan mr-4 group-hover:scale-110 transition-transform" size={24} />
                  <div>
                    <h3 className="font-medium mb-1">{item.label}</h3>
                    <p className="text-gray-300">{item.value}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div
              className="mt-12 glass p-6 rounded-lg border border-transparent hover:border-neon-cyan/20 transition-all duration-300"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              <h3 className="font-semibold mb-2">Current Availability</h3>
              <p className="text-gray-300">
                I am actively seeking <strong>internship opportunities</strong> and <strong>entry-level roles</strong> to launch my career as a Software Developer.
              </p>
              <div className="mt-4 flex items-center">
                <div className="w-3 h-3 rounded-full bg-green-500 mr-2 animate-pulse" />
                <span className="text-green-400 text-sm">Available for new projects and roles</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Contact form */}
          <motion.div
            className="md:w-2/3"
            initial={{ opacity: 0, x: 40 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <AnimatePresence>
              {statusMessage && (
                <motion.div
                  className={`p-4 mb-4 text-center text-sm font-medium rounded-lg flex items-center justify-center gap-2 ${
                    isSuccess ? 'text-green-400 bg-green-900/50' : 'text-yellow-400 bg-yellow-900/30'
                  }`}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  {isSuccess && <CheckCircle size={18} />}
                  {statusMessage}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="glass p-6 md:p-8 rounded-lg space-y-6">
              {/* Name */}
              <div className="relative">
                <label htmlFor="name" className="block mb-2 text-sm font-medium">Name</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                  placeholder="Your name"
                  required
                />
              </div>

              {/* Email */}
              <div className="relative">
                <label htmlFor="email" className="block mb-2 text-sm font-medium">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="your.email@example.com"
                  required
                />
              </div>

              {/* Message */}
              <div className="relative">
                <label htmlFor="message" className="block mb-2 text-sm font-medium">Message</label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className={`${inputClass} h-32 resize-none`}
                  placeholder="Your message..."
                  required
                />
              </div>

              <motion.button
                type="submit"
                disabled={isSending}
                className="btn-neon w-full flex items-center justify-center gap-2 disabled:opacity-50"
                whileHover={{ scale: 1.02, boxShadow: '0 0 25px rgba(3,233,244,0.4)' }}
                whileTap={{ scale: 0.98 }}
              >
                {isSending ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-current" />
                ) : (
                  <>
                    <Send size={18} />
                    Send Message
                  </>
                )}
              </motion.button>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
