import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Sparkles, Award, Star } from "lucide-react";

const GradeCircle = ({
  developerImpactScore,
  isCelebrating: propIsCelebrating = false,
}) => {
  const [isCelebrating, setIsCelebrating] = useState(propIsCelebrating);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (propIsCelebrating) {
      setIsCelebrating(true);
      const timer = setTimeout(() => setIsCelebrating(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [propIsCelebrating]);

  const getGradeColor = (grade) => {
    if (grade === "A+" || grade === "A") {
      return {
        primary: "from-emerald-800 to-teal-900",
        secondary: "from-emerald-800/20 to-teal-900/20",
        text: "text-emerald-600",
        glow: "shadow-emerald-800/50",
        particles: "#065f46",
      };
    } else if (grade === "B+" || grade === "B") {
      return {
        primary: "from-blue-800 to-indigo-900",
        secondary: "from-blue-800/20 to-indigo-900/20",
        text: "text-blue-600",
        glow: "shadow-blue-800/50",
        particles: "#1e3a8a",
      };
    } else if (grade === "C+" || grade === "C") {
      return {
        primary: "from-amber-800 to-orange-900",
        secondary: "from-amber-800/20 to-orange-900/20",
        text: "text-amber-600",
        glow: "shadow-amber-800/50",
        particles: "#92400e",
      };
    } else {
      return {
        primary: "from-red-900 to-rose-900",
        secondary: "from-red-900/20 to-rose-900/20",
        text: "text-red-600",
        glow: "shadow-red-900/50",
        particles: "#991b1b",
      };
    }
  };

  // Check if developerImpactScore and nested properties exist
  if (!developerImpactScore?.data?.score?.grade) {
    return <div></div>;
  }

  const colors = getGradeColor(developerImpactScore.data.score.grade);

  // Animated particles component
  const FloatingParticles = () => {
    const particles = Array.from({ length: 12 }, (_, i) => i);

    return (
      <div className="absolute inset-0 pointer-events-none">
        {particles.map((i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-gradient-to-r from-white to-transparent"
            style={{
              background: colors.particles,
              opacity: 0.6,
            }}
            animate={{
              x: [0, Math.random() * 200 - 100],
              y: [0, Math.random() * 200 - 100],
              opacity: [0.6, 0, 0.6],
              scale: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.2,
            }}
            initial={{
              x: Math.random() * 200 - 100,
              y: Math.random() * 200 - 100,
            }}
          />
        ))}
      </div>
    );
  };

  // Ripple effect component
  const RippleEffect = () => {
    return (
      <div className="absolute inset-0 pointer-events-none">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className={`absolute inset-0 rounded-full border-2 border-gradient-to-r ${colors.primary} opacity-30`}
            animate={{
              scale: [1, 1.5, 2],
              opacity: [0.5, 0.2, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.7,
              ease: "easeOut",
            }}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="relative mx-auto w-fit sm:mx-0">
      <AnimatePresence>
        <motion.div
          initial={{ scale: 0, opacity: 0, rotateY: 180 }}
          animate={{ scale: 1, opacity: 1, rotateY: 0 }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 20,
            duration: 0.8,
          }}
          className="group relative perspective-1000"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Floating Particles */}
          {(isCelebrating || isHovered) && <FloatingParticles />}

          {/* Ripple Effect */}
          {isHovered && <RippleEffect />}

          {/* Outer Glow Ring */}
          <motion.div
            className={`absolute inset-0 rounded-full bg-gradient-to-r ${colors.primary} opacity-20 blur-xl`}
            animate={{
              scale: isHovered ? [1, 1.1, 1] : 1,
              rotate: [0, 360],
            }}
            transition={{
              scale: { duration: 2, repeat: Infinity },
              rotate: { duration: 8, repeat: Infinity, ease: "linear" },
            }}
          />

          {/* Main Circle Container */}
          <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden">
            {/* 3D Base Shadow */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-black/20 to-black/40 blur-2xl transform translate-y-6 scale-95 -z-10" />

            {/* Main Circle */}
            <motion.div
              className={`w-full h-full rounded-full bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 dark:from-slate-200 dark:via-slate-100 dark:to-white flex items-center justify-center shadow-2xl relative overflow-hidden border-4 border-gradient-to-r ${colors.primary} ${colors.glow}`}
              whileHover={{
                scale: 1.05,
                rotateY: 10,
                rotateX: 5,
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 20,
              }}
            >
              {/* Inner Gradient Overlay */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${colors.secondary} opacity-30`}
              />

              {/* Shimmer Effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
                animate={{
                  x: isHovered ? [-200, 200] : [-200, -200],
                }}
                transition={{
                  duration: 1.5,
                  ease: "easeInOut",
                }}
              />

              {/* Grade Text */}
              <motion.div
                initial={{ scale: 0.8, rotateX: 30 }}
                animate={{
                  scale: isHovered ? 1.1 : 1,
                  rotateX: 0,
                  y: isHovered ? -5 : 0,
                }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 15,
                }}
                className={`relative z-10 text-5xl sm:text-7xl font-black ${colors.text} drop-shadow-2xl`}
                style={{
                  textShadow: `0 4px 20px ${colors.particles}40, 0 0 40px ${colors.particles}20`,
                  filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))",
                }}
              >
                {developerImpactScore.data.score.grade}
              </motion.div>

              {/* Sparkle Effects */}
              <AnimatePresence>
                {(isCelebrating || isHovered) && (
                  <>
                    {[...Array(6)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{
                          scale: [0, 1, 0],
                          opacity: [0, 1, 0],
                          rotate: [0, 360],
                        }}
                        transition={{
                          duration: 2,
                          delay: i * 0.2,
                          repeat: Infinity,
                        }}
                        style={{
                          top: `${20 + Math.random() * 60}%`,
                          left: `${20 + Math.random() * 60}%`,
                        }}
                      >
                        <Sparkles
                          className={`w-3 h-3 sm:w-4 sm:h-4 ${colors.text}`}
                        />
                      </motion.div>
                    ))}
                  </>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Achievement Badges */}
          <motion.div
            whileHover={{ rotate: 360, scale: 1.2 }}
            transition={{ duration: 0.6 }}
            className={`absolute -top-4 -right-4 w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r ${colors.primary} rounded-full flex items-center justify-center shadow-lg ${colors.glow}`}
          >
            <Award className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow-lg" />
          </motion.div>

          <motion.div
            whileHover={{ rotate: -360, scale: 1.2 }}
            transition={{ duration: 0.6 }}
            className="absolute -bottom-4 -left-4 w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/50"
          >
            <Star className="w-4 h-4 sm:w-5 sm:h-5 text-white drop-shadow-lg" />
          </motion.div>

          <motion.div
            whileHover={{ rotate: 180, scale: 1.2 }}
            transition={{ duration: 0.6 }}
            className="absolute -top-4 -left-4 w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/50"
          >
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-white drop-shadow-lg" />
          </motion.div>

          {/* Performance Indicator Ring */}
          <motion.div
            className="absolute inset-0 rounded-full border-4 border-transparent"
            style={{
              background: `conic-gradient(from 0deg, ${colors.particles}, transparent 75%, ${colors.particles})`,
              mask: "radial-gradient(circle, transparent 70%, black 70%)",
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default GradeCircle;
