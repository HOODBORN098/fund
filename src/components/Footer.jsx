export default function Footer() {
  return (
    <footer className="w-full bottom-0 bg-surface-container-lowest border-t border-outline-variant">
      <div className="flex flex-col md:flex-row justify-between items-center py-xl px-margin-mobile md:px-margin-desktop max-w-[1200px] mx-auto w-full">
        <div className="mb-lg md:mb-0 text-center md:text-left">
          <div className="font-headline-md text-headline-md text-primary mb-xs">FundLoop</div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">© 2024 FundLoop. Secure Institutional Finance.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-xl">
          <a className="text-on-surface-variant font-label-sm text-label-sm hover:text-primary transition-colors focus:ring-2 focus:ring-primary" href="#">Terms of Service</a>
          <a className="text-on-surface-variant font-label-sm text-label-sm hover:text-primary transition-colors focus:ring-2 focus:ring-primary" href="#">Privacy Policy</a>
          <a className="text-on-surface-variant font-label-sm text-label-sm hover:text-primary transition-colors focus:ring-2 focus:ring-primary" href="#">Security Standards</a>
          <a className="text-on-surface-variant font-label-sm text-label-sm hover:text-primary transition-colors focus:ring-2 focus:ring-primary" href="#">Support</a>
        </div>
        <div className="mt-lg md:mt-0 flex gap-md">
          <a className="w-10 h-10 rounded-full border border-outline-variant flex items-center justify-center text-secondary hover:bg-surface-container transition-colors" href="#">
            <span className="material-symbols-outlined text-[20px]">language</span>
          </a>
          <a className="w-10 h-10 rounded-full border border-outline-variant flex items-center justify-center text-secondary hover:bg-surface-container transition-colors" href="#">
            <span className="material-symbols-outlined text-[20px]">mail</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
