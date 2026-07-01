import React from 'react';
import { Link } from 'react-router-dom';
import TopNavBar from '../components/TopNavBar';
import Footer from '../components/Footer';

export default function WelcomePage() {
  return (
    <>
      
{/*  Top Navigation Bar  */}
<TopNavBar variant="landing" />
<main>
{/*  Hero Section  */}
<section className="relative overflow-hidden pt-3xl pb-2xl md:pt-3xl md:pb-3xl">
<div className="absolute inset-0 matrix-grid pointer-events-none"></div>
<div className="max-w-[1200px] mx-auto px-margin-mobile md:px-margin-desktop grid grid-cols-1 lg:grid-cols-2 gap-2xl items-center relative z-10">
<div className="flex flex-col gap-xl">
<div className="flex items-center gap-sm">
<span className="bg-secondary-container text-on-secondary-container px-sm py-xs rounded-full font-label-sm text-label-sm uppercase tracking-wider">Institutional Standard</span>
<div className="h-[1px] flex-grow bg-outline-variant"></div>
</div>
<h1 className="font-display-lg text-display-lg text-primary max-w-xl leading-tight" style={{ "opacity": "1", "transform": "translateY(0px)", "transition": "0.8s ease-out" }}>
                        Institutional-Grade <br className="hidden md:block" />Chama Management.
                    </h1>
<p className="font-body-lg text-body-lg text-secondary max-w-lg">
                        Secure. Transparent. Automated. Empowering investment groups with the same rigor and security protocols used by top-tier financial institutions.
                    </p>
<div className="flex flex-col sm:flex-row gap-md mt-sm">
<Link to="/setup" className="bg-primary-container text-on-primary-container px-xl py-md rounded-lg font-label-md text-label-md flex items-center justify-center gap-sm shadow-md hover:shadow-lg transition-all active:scale-[0.98]">Create a Chama <span className="material-symbols-outlined">add_circle</span></Link>
<Link to="/login" className="border border-primary text-primary px-xl py-md rounded-lg font-label-md text-label-md flex items-center justify-center gap-sm hover:bg-surface-container-low transition-colors">Join a Chama <span className="material-symbols-outlined">group_add</span></Link>
</div>
<div className="flex items-center gap-md pt-md">
<div className="flex -space-x-3">
<div className="w-10 h-10 rounded-full border-2 border-white bg-primary-fixed flex items-center justify-center font-bold text-primary text-sm">PI</div>
<div className="w-10 h-10 rounded-full border-2 border-white bg-secondary-fixed flex items-center justify-center font-bold text-primary text-sm">UW</div>
<div className="w-10 h-10 rounded-full border-2 border-white bg-tertiary-fixed flex items-center justify-center font-bold text-primary text-sm">EG</div>
</div>
<p className="font-label-sm text-label-sm text-on-surface-variant">Join Kenyan Chamas already using FundLoop</p>
</div>
</div>
<div className="hidden lg:block relative">
<div className="bg-surface-container-highest rounded-xl p-md shadow-xl border border-outline-variant transform rotate-2 hover:rotate-0 transition-transform duration-500">
<div className="bg-white rounded-lg overflow-hidden border border-outline-variant shadow-sm">
<div className="p-md border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
<div className="flex items-center gap-sm">
<span className="material-symbols-outlined text-primary" style={{ "fontVariationSettings": "'FILL' 1" }}>verified_user</span>
<span className="font-label-md text-label-md text-primary">Equity Group Alpha</span>
</div>
<span className="bg-success-container text-success px-sm py-xs rounded font-label-sm text-label-sm">Active Cycle</span>
</div>
<div className="p-lg space-y-md">
<div className="flex justify-between items-end">
<div>
<p className="text-on-surface-variant font-label-sm text-label-sm uppercase">Total Pool Balance</p>
<h3 className="font-headline-lg text-headline-lg text-primary">$450,250.00</h3>
</div>
<div className="text-right">
<p className="text-on-surface-variant font-label-sm text-label-sm">NEXT DRAW</p>
<p className="font-label-md text-label-md text-primary">Jan 15, 2024</p>
</div>
</div>
<div className="w-full bg-surface-container rounded-full h-2">
<div className="bg-primary w-3/4 h-2 rounded-full"></div>
</div>
<div className="grid grid-cols-2 gap-md pt-sm">
<div className="p-sm border border-outline-variant rounded bg-surface-container-lowest">
<p className="text-on-surface-variant font-label-sm text-label-sm">Contributors</p>
<p className="font-label-md text-label-md">12 Members</p>
</div>
<div className="p-sm border border-outline-variant rounded bg-surface-container-lowest">
<p className="text-on-surface-variant font-label-sm text-label-sm">Risk Score</p>
<p className="font-label-md text-label-md text-green-700">A+ Stable</p>
</div>
</div>
</div>
</div>
</div>
{/*  Abstract Decorative element  */}
<div className="absolute -top-12 -right-12 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10"></div>
</div>
</div>
</section>
{/*  Benefits Section - Bento Grid  */}
<section className="py-3xl bg-surface-container-lowest relative overflow-hidden">
<div className="max-w-[1200px] mx-auto px-margin-mobile md:px-margin-desktop">
<div className="text-center mb-2xl">
<h2 className="font-headline-lg text-headline-lg text-primary mb-md">Engineered for Financial Integrity</h2>
<p className="font-body-md text-body-md text-secondary max-w-2xl mx-auto">Our platform combines traditional community savings models with cutting-edge fintech security and automation.</p>
</div>
<div className="grid grid-cols-1 md:grid-cols-3 gap-lg h-auto md:h-[500px]">
{/*  Large Feature  */}
<div className="md:col-span-2 bg-primary rounded-xl p-xl flex flex-col justify-between text-on-primary relative overflow-hidden group">
<div className="absolute top-0 right-0 p-xl opacity-20 group-hover:opacity-40 transition-opacity">
<span className="material-symbols-outlined text-[120px]" style={{ "fontVariationSettings": "'FILL' 1" }}>security</span>
</div>
<div>
<span className="material-symbols-outlined mb-md text-primary-fixed" style={{ "fontVariationSettings": "'FILL' 1" }}>admin_panel_settings</span>
<h3 className="font-headline-md text-headline-md mb-md">Multi-tenant Security Architecture</h3>
<p className="font-body-md text-body-md text-primary-fixed-dim max-w-md">Each Chama operates in a digitally isolated environment with AES-256 encryption. FundLoop ensures that your group's assets and data remain private, secure, and segregated from other platform users.</p>
</div>
<ul className="flex flex-wrap gap-md mt-xl">
<li className="flex items-center gap-xs font-label-md text-label-md border border-primary-fixed-dim/30 px-md py-xs rounded-full">
<span className="material-symbols-outlined text-[16px]">check_circle</span> Biometric Auth
                            </li>
<li className="flex items-center gap-xs font-label-md text-label-md border border-primary-fixed-dim/30 px-md py-xs rounded-full">
<span className="material-symbols-outlined text-[16px]">check_circle</span> Hardware Key Support
                            </li>
<li className="flex items-center gap-xs font-label-md text-label-md border border-primary-fixed-dim/30 px-md py-xs rounded-full">
<span className="material-symbols-outlined text-[16px]">check_circle</span> SOC2 Type II
                            </li>
</ul>
</div>
{/*  Vertical Feature  */}
<div className="bg-surface-container rounded-xl p-xl border border-outline-variant flex flex-col justify-between hover:bg-surface-container-high transition-colors">
<div>
<span className="material-symbols-outlined mb-md text-primary" style={{ "fontVariationSettings": "'FILL' 1" }}>sync_alt</span>
<h3 className="font-headline-md text-headline-md text-primary mb-md">Automated ROSCA Cycles</h3>
<p className="font-body-sm text-body-sm text-on-surface-variant">Eliminate manual tracking. Our engine handles complex rotation schedules, contribution collection, and automatic payouts based on smart-contract logic.</p>
</div>
<div className="mt-xl pt-lg border-t border-outline-variant">
<div className="flex justify-between items-center mb-sm">
<span className="font-label-sm text-label-sm">Success Rate</span>
<span className="font-label-sm text-label-sm text-primary font-bold">99.9%</span>
</div>
<div className="w-full bg-outline-variant h-1 rounded-full overflow-hidden">
<div className="bg-primary w-full h-full"></div>
</div>
</div>
</div>
{/*  Small Feature Bottom  */}
<div className="bg-white border border-outline-variant rounded-xl p-xl flex flex-col md:flex-row md:items-center gap-xl md:col-span-3 hover:shadow-md transition-shadow">
<div className="bg-primary-container/10 p-lg rounded-full flex items-center justify-center shrink-0">
<span className="material-symbols-outlined text-primary-container text-3xl" style={{ "fontVariationSettings": "'FILL' 1" }}>how_to_vote</span>
</div>
<div className="flex-grow">
<h3 className="font-headline-md text-headline-md text-primary mb-xs">Transparent Governance Voting</h3>
<p className="font-body-md text-body-md text-on-surface-variant">Democratic decision making built into the core. Propose investments, approve new members, or change bylaws with verifiable on-chain voting records.</p>
</div>
<div className="shrink-0">
<Link to="/setup" className="text-primary font-label-md text-label-md border-b-2 border-transparent hover:border-primary transition-all">Explore Governance Tools</Link>
</div>
</div>
</div>
</div>
</section>
{/*  Trust Section  */}
<section className="py-2xl bg-background border-t border-outline-variant">
<div className="max-w-[1200px] mx-auto px-margin-mobile md:px-margin-desktop text-center">
<p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-[0.2em] mb-xl">Compliant with International Financial Standards</p>
<div className="flex flex-wrap justify-center items-center gap-2xl opacity-60 grayscale hover:grayscale-0 transition-all duration-700">
<span className="font-display-lg text-headline-md font-bold text-secondary">ISO 27001</span>
<span className="font-display-lg text-headline-md font-bold text-secondary">GDPR</span>
<span className="font-display-lg text-headline-md font-bold text-secondary">PCI DSS</span>
<span className="font-display-lg text-headline-md font-bold text-secondary">KYC/AML</span>
</div>
</div>
</section>
{/*  CTA Section  */}
<section className="py-3xl relative">
<div className="max-w-[1200px] mx-auto px-margin-mobile md:px-margin-desktop">
<div className="bg-inverse-surface text-inverse-on-surface rounded-2xl p-2xl md:p-3xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-2xl">
<div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(0,51,102,0.1)_0%,transparent_100%)]"></div>
<div className="relative z-10 max-w-xl">
<h2 className="font-headline-lg text-headline-lg mb-md">Ready to Institutionalize Your Wealth Group?</h2>
<p className="font-body-lg text-body-lg text-on-tertiary-container">Join thousands of professional circles managing over $2B in combined assets globally. Start your first cycle in under 5 minutes.</p>
</div>
<div className="relative z-10 flex flex-col gap-md w-full md:w-auto">
<Link to="/setup" className="text-center bg-primary-fixed text-on-primary-fixed px-2xl py-md rounded font-label-md text-label-md hover:bg-primary-fixed-dim transition-colors shadow-lg">Start Free Trial</Link>
<Link to="/login" className="text-center text-white border border-outline px-2xl py-md rounded font-label-md text-label-md hover:bg-white/10 transition-colors">Log In Instead</Link>
</div>
</div>
</div>
</section>
</main>
{/*  Footer  */}
<Footer />




    </>
  );
}
