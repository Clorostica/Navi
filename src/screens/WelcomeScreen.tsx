import MoltenMetal from '../components/MoltenMetal';
import SplitText from '../components/SplitText';
import TextType from '../components/TextType';
import { copy } from '../content/copy';
import { useApp } from '../state/AppContext';

const taglines = ['Your U-Bahn co-pilot.', 'Next stop: sorted.', 'Berlin, always in motion.'];

export default function WelcomeScreen() {
  const { navigate } = useApp();
  const c = copy.welcome;

  return (
    <div className="screen welcome-screen">
      <div className="welcome-bg">
        <MoltenMetal
          color1="#1a0533"
          color2="#aa3bff"
          color3="#ffffff"
          speed={0.25}
          scale={3.5}
          detail={3}
          glow={1.3}
          coreSize={0.09}
          swirl={0.8}
          fold={-0.2}
          blackPoint={0.05}
          brightness={1}
          colorMode="frost"
          grain
          grainIntensity={0.03}
          mouseInteraction
          mouseStrength={0.25}
          opacity={1}
        />
      </div>
      <div className="welcome-content">
        <div className="navi-logo-lockup">
          <span className="navi-roundel" aria-hidden="true">
            N
          </span>
          <span className="navi-wordmark">Navi</span>
        </div>
        <TextType
          as="div"
          className="navi-tagline"
          text={taglines}
          typingSpeed={55}
          deletingSpeed={25}
          pauseDuration={1800}
          cursorCharacter="_"
          cursorClassName="navi-tagline-cursor"
        />
        <div className="welcome-copy">
          <h1 className="welcome-headline">
            <SplitText
              tag="span"
              text="Berlin's on the move."
              splitType="words"
              textAlign="left"
              delay={40}
              duration={0.7}
              ease="power3.out"
              from={{ opacity: 0, y: 24 }}
              to={{ opacity: 1, y: 0 }}
            />
            <br />
            <SplitText
              tag="span"
              text="So are we."
              splitType="words"
              textAlign="left"
              delay={40}
              duration={0.7}
              ease="power3.out"
              from={{ opacity: 0, y: 24 }}
              to={{ opacity: 1, y: 0 }}
            />
          </h1>
          <p>{c.description}</p>
        </div>
        <div className="welcome-actions">
          <button type="button" className="btn btn-primary" onClick={() => navigate('login')}>
            {c.loginButton}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('signup')}>
            {c.signupButton}
          </button>
        </div>
      </div>
    </div>
  );
}
