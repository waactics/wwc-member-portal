import React from 'react';
import { useNavigate } from 'react-router-dom';
import './css/Homepage.css';
import './css/team.module.css'; //import the team styles

// Import social icons
import './css/team.module.css';
import Github from './images/github.png';
import Linkedin from './images/linkedin.png';
import Email from './images/email.png';

// Import team images (you'll need to add these)
import Aishwarya from './images/team/aishwarya.jpg';
import Nihita from './images/team/nihita.jpg';
import Dheeptha from './images/team/dheeptha.jpg';
import Esha from './images/team/esha.jpg';
import Julia from './images/team/julia.jpg';
import Aarya from './images/team/aarya.jpg';
import Waverly from './images/team/waverly.jpg';
import Nandini from './images/team/nandini.jpg';
import Adeline from './images/team/adeline.jpg';
import Khyati from './images/team/khyati.jpg';
import Sameera from './images/team/sameera.jpg';

const Homepage = () => {
    const navigate = useNavigate();

    //smooth scrolling for navigation
    const scrollTo = (id) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    };

    /* TEAM DATA */
    const team = [
        {
            name: "Aishwarya Sudarshan",
            position: "President",
            image: Aishwarya,
            github: "https://github.com/AishwaryaSudarshan",
            linkedin: "https://linkedin.com/in/aishwarya-sudarshan",
            email: "mailto:aishwaryasudarshan18@gmail.com",
        },
        {
            name: "Dheeptha Kadiam",
            position: "Vice President",
            image: Dheeptha,
            github: "https://github.com/dheepsk",
            linkedin: "https://linkedin.com/in/dheeptha-kadiam",
            email: "mailto:dheeps0702@gmail.com",
        },
        {
            name: "Waverly Souvannachack",
            position: "Marketing",
            image: Waverly,
            github: "https://github.com/waverlys04",
            linkedin: "https://linkedin.com/in/wsouvannachack",
            email: "mailto:waverly.souvannachack@gmail.com",
        },
        {
            name: "Nihita Soma",
            position: "Secretary",
            image: Nihita,
            github: "https://github.com/nihitasoma",
            linkedin: "https://linkedin.com/in/nihitasoma",
            email: "mailto:soma.nihita@gmail.com",
        },
        {
            name: "Julia Marie Bacud",
            position: "Backend Developer",
            image: Julia,
            github: "https://github.com/waactics",
            linkedin: "https://linkedin.com/in/julia-marie-bacud-a16b70241",
            email: "mailto:juliabacudswe@gmail.com",
        },
        {
            name: "Aaryaa Moharir",
            position: "Event Planner",
            image: Aarya,
            github: "https://github.com/aaryaamoharir",
            linkedin: "https://linkedin.com/in/aaryaamoharir",
            email: "mailto:aaryaamoharir@gmail.com",
        },
        {
            name: "Adeline Nenzou",
            position: "Event Planner",
            image: Adeline,
            github: "https://github.com/ades101",
            linkedin: "https://linkedin.com/in/adelinenenzou",
            email: "mailto:adeline.nen21@gmail.com",
        },
        {
            name: "Esha Gupta",
            position: "Treasurer",
            image: Esha,
            github: "https://google.com",
            linkedin: "https://linkedin.com/in/eshagupta825",
            email: "mailto:eshalagupta@gmail.com",
        },
        {
            name: "Khyati Chandra",
            position: "Designer",
            image: Khyati,
            github: "https://google.com",
            linkedin: "https://linkedin.com/khyatichandra",
            email: "mailto:khyatichandra@gmail.com",
        },
        {
            name: "Nandini Paidesetty",
            position: "Photographer",
            image: Nandini,
            github: "https://github.com/nxp-22",
            linkedin: "https://linkedin.com/in/nandini-paidesetty-9b997220a",
            email: "mailto:nxp220069@utdallas.edu",
        },
        {
            name: "Sameera Kandalgaonkar",
            position: "UX Designer",
            image: Sameera,
            github: "https://github.com/SameeraaGKan",
            linkedin: "https://linkedin.com/in/sameeraakan118",
            email: "mailto:sameeraagk883@gmail.com",
        }
    ];

    /* PARTNERS DATA */
    const partners = [
        { name: 'JPMorgan Chase', logo: '#' },
        { name: 'AT&T', logo: '#' },
        { name: 'American Airlines', logo: '#' },
        { name: 'State Farm', logo: '#' }, 
        { name: 'Core Logic', logo: '#' },
        { name: 'Cisco', logo: '#' },
        { name: 'McAfee', logo: '#' },
        { name: 'Allstate', logo: '#' },
        { name: 'Intuit', logo: '#' },
        { name: 'Celanese', logo: '#' },
        { name: 'Fannie Mae', logo: '#' },
        { name: 'USAA', logo: '#' },
        { name: 'Blue Yonder', logo: '#' },
        { name: 'CBRE', logo: '#' }
    ];

    return (
        <div className="homepage">
            {/* --- NAVBAR --- */}
            <nav className="navbar">
                <div className="navbar__logo">Women Who Compute</div>
                <div className="navbar__links">
                    <button onClick={() => scrollTo('header')}>Home</button>
                    <button onClick={() => scrollTo('values')}>What We Offer</button>
                    <button onClick={() => scrollTo('team')}>Team</button>
                    <button onClick={() => scrollTo('partners')}>Partners</button>
                    <button 
                        className="navbar__login-button"
                        onClick={() => navigate('/login')}
                    >
                        Member Login
                    </button>
                </div>
            </nav>

            {/* --- HEADER --- */}
            <section id="header" className="section section--header">
                <div className="header__content">
                    <h1>Empowering the Future of Tech</h1>
                    <p>At Women Who Compute, we are dedicated to the empowerment and advancement of women in engineering and computer science.</p>
                </div>
            </section>

            {/* --- VALUES --- */}
            <section id="values" className="section section--values">
                <h2>What We Offer</h2>
                <div className="values__grid">
                    <div className="value-card">
                        <h3>Speed Mentoring</h3>
                        <p>Join our networking event armed with your resume, blazer, and elevator pitch to engage with Dallas' top engineers and recruiters for securing high-profile internships and jobs.</p>
                    </div>
                    <div className="value-card">
                        <h3>Technical Workshops</h3>
                        <p>Through our technical workshops, led by industry engineers, we enhance students' programming skills for better career prospects.</p>
                    </div>
                    <div className="value-card">
                        <h3>Career Talks</h3>
                        <p>Explore the corporate engineering world through our career talks and the nature of work in diverse companies.</p>
                    </div>
                    <div className="value-card">
                        <h3>WeHack</h3>
                        <p>WeHack at UTD: Empowering underrepresented tech innovators to build skills and solve complex problems through our women and non-binary focused hackathon.</p>
                    </div>
                </div>
            </section>

            {/* --- TEAM SECTION --- */}
            <section id="team" className="section section--team">
                <div className="team-header">
                    <div className="top-line"></div>
                    <div className="scroll-text">Meet Our Team</div>
                    <div className="bottom-line"></div>
                </div>

                <div className="team-grid-container">
                    {team.map((officer, index) => (
                        <div key={index} className="team-card">
                            <div className="team-image-container">
                                <img src={officer.image} alt={officer.name} className="team-image"/>
                                <div className="team-social-links">
                                    <a href={officer.github || "#"} target="_blank" rel="noopener noreferrer">
                                        <img src={Github} className="social-icon" alt="github"/>
                                    </a>
                                    <a href={officer.linkedin || "#"} target="_blank" rel="noopener noreferrer">
                                        <img src={Linkedin} className="social-icon" alt="linkedin"/>
                                    </a>
                                    <a href={officer.email || "#"} target="_blank" rel="noopener noreferrer">
                                        <img src={Email} className="social-icon" alt="email"/>
                                    </a>
                                </div>
                            </div>
                            <div className="team-info">
                                <h3 className="team-name">{officer.name}</h3>
                                <p className="team-position">{officer.position}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* --- PARTNERS --- */}
            <section id="partners" className="section section--partners">
                <h2>Our Partners</h2>
                <div className="partners__grid">
                    {partners.map((partner, index) => (
                        <div key={index} className="partner-logo">
                            {partner.name}
                        </div>
                    ))}
                </div>
            </section>

            {/* --- FOOTER --- */}
            <footer className="footer">
                <div className="footer__content">
                    <div className="footer__info">
                        <h3>Women Who Compute</h3>
                        <p>University of Texas at Dallas</p>
                        <p>Richardson, TX</p>
                    </div>
                    <div className="footer__links">
                        <a href="#header">Home</a>
                        <a href="#values">What We Offer</a>
                        <a href="#team">Team</a>
                        <a href="#partners">Partners</a>
                    </div>
                </div>
                <div className="footer__copyright">
                    © {new Date().getFullYear()} Women Who Compute
                </div>
            </footer>
        </div>
    );
};

export default Homepage;