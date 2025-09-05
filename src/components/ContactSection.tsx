import { Mail, MapPin, Phone, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

// This component presents the contact section of the portfolio,
// optimized to clearly state the developer's availability for roles.
const ContactSection = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  // REPLACE THIS URL WITH YOUR ACTUAL FORMSPREE ENDPOINT
  const formspreeEndpoint = 'https://formspree.io/f/xeolppkl';

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );
    
    const section = document.getElementById('contact');
    if (section) observer.observe(section);
    
    return () => {
      if (section) observer.unobserve(section);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage("Sending message...");
    
    try {
      const response = await fetch(formspreeEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ name, email, message })
      });

      if (response.ok) {
        setStatusMessage('Message sent successfully! I will get back to you soon.');
        setName('');
        setEmail('');
        setMessage('');
      } else {
        setStatusMessage('An error occurred. Please try again or contact me directly via email.');
      }
    } catch (error) {
      setStatusMessage('An error occurred. Please try again or contact me directly via email.');
    }

    setTimeout(() => {
      setStatusMessage('');
    }, 5000);
  };

  return (
    <section id="contact" className="py-24 bg-black/30">
      <div className="container mx-auto px-4">
        <h2 className="section-title">Contact Me</h2>
        <p className="text-gray-300 mb-12 max-w-2xl">
          I'm actively seeking **internship opportunities** and **full-time roles** as a fresh graduate. Let's connect and build something great together!
        </p>
        
        <div className="flex flex-col md:flex-row gap-10">
          {/* Contact info */}
          <div className={`md:w-1/3 transition-all duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0 translate-x-[-20px]'}`}>
            <div className="space-y-8">
              <div className="flex items-start">
                <Mail className="text-neon-cyan mr-4" size={24} />
                <div>
                  <h3 className="font-medium mb-1">Email</h3>
                  <p className="text-gray-300">ik9893344@gmail.com</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <MapPin className="text-neon-cyan mr-4" size={24} />
                <div>
                  <h3 className="font-medium mb-1">Location</h3>
                  <p className="text-gray-300">Chikkaballapur, Karnataka, India</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <Phone className="text-neon-cyan mr-4" size={24} />
                <div>
                  <h3 className="font-medium mb-1">Phone</h3>
                  <p className="text-gray-300">+91 9346476951</p>
                </div>
              </div>
            </div>
            
            <div className="mt-12 glass p-6 rounded-lg">
              <h3 className="font-semibold mb-2">Current Availability</h3>
              <p className="text-gray-300">
                I am actively seeking **internship opportunities** and **entry-level roles** to launch my career as a Software Developer.
              </p>
              <div className="mt-4 flex items-center">
                <div className="w-3 h-3 rounded-full bg-green-500 mr-2 animate-pulse"></div>
                <span className="text-green-400 text-sm">Available for new projects and roles</span>
              </div>
            </div>
          </div>
          
          {/* Contact form */}
          <div className={`md:w-2/3 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100' : 'opacity-0 translate-x-[20px]'}`}>
            {statusMessage && (
              <div className="p-4 mb-4 text-center text-sm font-medium text-green-400 bg-green-900/50 rounded-lg">
                {statusMessage}
              </div>
            )}
            <form onSubmit={handleSubmit} className="glass p-6 md:p-8 rounded-lg">
              <div className="mb-6">
                <label htmlFor="name" className="block mb-2 text-sm font-medium">
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg focus:outline-none focus:border-neon-cyan text-white"
                  placeholder="Your name"
                  required
                />
              </div>
              
              <div className="mb-6">
                <label htmlFor="email" className="block mb-2 text-sm font-medium">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg focus:outline-none focus:border-neon-cyan text-white"
                  placeholder="your.email@example.com"
                  required
                />
              </div>
              
              <div className="mb-6">
                <label htmlFor="message" className="block mb-2 text-sm font-medium">
                  Message
                </label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg focus:outline-none focus:border-neon-cyan text-white h-32 resize-none"
                  placeholder="Tell me about your project..."
                  required
                ></textarea>
              </div>
              
              <Button type="submit" className="btn-neon w-full flex items-center justify-center">
                <Send className="mr-2" size={18} />
                Send Message
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;