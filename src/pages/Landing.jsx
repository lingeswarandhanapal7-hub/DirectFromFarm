import { useNavigate } from 'react-router-dom';
import Beams from '../components/Beams';
import LogoLoop from '../components/LogoLoop';

import img1 from '../../1.webp';
import img2 from '../../2.webp';
import img3 from '../../3.webp';
import img4 from '../../4.webp';
import img5 from '../../5.webp';
import img6 from '../../6.webp';
import img7 from '../../7.webp';
import img8 from '../../8.webp';
import img9 from '../../9.webp';
import img10 from '../../10.webp';

const farmImages = [
    { src: img1, alt: 'Fresh farm produce 1' },
    { src: img2, alt: 'Fresh farm produce 2' },
    { src: img3, alt: 'Fresh farm produce 3' },
    { src: img4, alt: 'Fresh farm produce 4' },
    { src: img5, alt: 'Fresh farm produce 5' },
    { src: img6, alt: 'Fresh farm produce 6' },
    { src: img7, alt: 'Fresh farm produce 7' },
    { src: img8, alt: 'Fresh farm produce 8' },
    { src: img9, alt: 'Fresh farm produce 9' },
    { src: img10, alt: 'Fresh farm produce 10' },
];

export default function Landing() {
    const navigate = useNavigate();

    return (
        <div className="page-wrapper" style={{ minHeight: '100vh' }}>
            {/* Beams Background */}
            <div className="beams-bg">
                <Beams beamWidth={3} beamHeight={30} beamNumber={20} lightColor="#4caf72" speed={1.5} noiseIntensity={1.75} scale={0.2} rotation={30} />
            </div>

            <div className="page-content" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '48px' }}>
                    <div style={{ fontSize: '56px', marginBottom: '8px' }}>🌾</div>
                    <h1 style={{ fontSize: '42px', fontWeight: 900, color: '#4caf72', letterSpacing: '-1px' }}>
                        Direct<span style={{ color: '#f59e0b' }}>From</span>Farm
                    </h1>
                    <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.7)', marginTop: '8px', maxWidth: '400px' }}>
                        Fresh from the farm, straight to your table
                    </p>
                    <p style={{ fontSize: '14px', color: '#a8d5b5', marginTop: '4px', fontFamily: 'Noto Sans Tamil, sans-serif' }}>
                        விவசாயிகளிடமிருந்து நேரடியாக உங்கள் வீட்டிற்கு
                    </p>
                </div>

                {/* Role Selection */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', maxWidth: '600px', width: '100%' }}>
                    {/* Farmer Card */}
                    <div
                        className="role-card"
                        style={{ cursor: 'pointer', padding: '32px 20px' }}
                        onClick={() => navigate('/auth/farmer')}
                    >
                        <div style={{ fontSize: '64px', marginBottom: '12px' }}>👨‍🌾</div>
                        <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'white', marginBottom: '4px' }}>Farmer</h3>
                        <p style={{ fontSize: '14px', color: '#a8d5b5', fontFamily: 'Noto Sans Tamil, sans-serif' }}>விவசாயி</p>
                        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '8px' }}>Sell your produce</p>
                        <div style={{ marginTop: '16px', padding: '8px 16px', background: 'rgba(76,175,114,0.2)', borderRadius: '20px', fontSize: '12px', color: '#4caf72', fontWeight: 600 }}>
                            🎤 Tamil Voice Support
                        </div>
                    </div>

                    {/* Buyer Card */}
                    <div
                        className="role-card"
                        style={{ cursor: 'pointer', padding: '32px 20px' }}
                        onClick={() => navigate('/auth/buyer')}
                    >
                        <div style={{ fontSize: '64px', marginBottom: '12px' }}>🛒</div>
                        <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'white', marginBottom: '4px' }}>Buyer</h3>
                        <p style={{ fontSize: '14px', color: '#a8d5b5' }}>வாங்குபவர்</p>
                        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '8px' }}>Buy fresh produce</p>
                        <div style={{ marginTop: '16px', padding: '8px 16px', background: 'rgba(245,158,11,0.2)', borderRadius: '20px', fontSize: '12px', color: '#f59e0b', fontWeight: 600 }}>
                            🧾 PDF Bills
                        </div>
                    </div>
                </div>

                {/* Features */}
                <div style={{ display: 'flex', gap: '24px', marginTop: '48px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {[
                        { icon: '🌿', text: 'Fresh & Organic' },
                        { icon: '🗣️', text: 'Tamil Voice Guide' },
                        { icon: '📱', text: 'Works on any device' },
                        { icon: '🔔', text: 'Instant Notifications' },
                    ].map(f => (
                        <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>
                            <span>{f.icon}</span> {f.text}
                        </div>
                    ))}
                </div>

                {/* Farm Image Strip */}
                <div style={{ width: '100vw', marginLeft: 'calc(-50vw + 50%)', marginTop: '56px' }}>
                    <p style={{ textAlign: 'center', fontSize: '12px', letterSpacing: '3px', textTransform: 'uppercase', color: 'rgba(76,175,114,0.7)', marginBottom: '20px', fontWeight: 600 }}>
                        🌾 Fresh From Our Farms
                    </p>
                    <div style={{ height: '180px', overflow: 'hidden', position: 'relative' }}>
                        <LogoLoop
                            logos={farmImages}
                            speed={80}
                            direction="left"
                            logoHeight={160}
                            gap={20}
                            pauseOnHover
                            scaleOnHover
                            fadeOut
                            fadeOutColor="#0d1f15"
                            ariaLabel="Fresh farm produce gallery"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
