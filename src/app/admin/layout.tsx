import type { Metadata } from 'next';
import './../globals.css';

export const metadata: Metadata = {
  title: 'Viafinds Admin Control Center',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navItems = [
    { name: 'Dashboard', href: '/admin', icon: 'dashboard', active: false },
    { name: 'Content CRM', href: '/admin/content-crm', icon: 'database', active: true },
    { name: 'Revenue & Analytics', href: '/admin/revenue', icon: 'insights', active: false },
    { name: 'Automation Workflow', href: '/admin/automation', icon: 'settings_input_component', active: false },
    { name: 'API Integrations', href: '/admin/integrations', icon: 'api', active: false },
    { name: 'Link Vault', href: '/admin/link-vault', icon: 'link', active: false },
    { name: 'Settings', href: '/admin/settings', icon: 'settings', active: false },
  ];

  return (
    <div className="bg-background text-on-surface font-ui-body min-h-screen flex antialiased">
      <nav className="fixed left-0 top-0 h-full w-sidebar-width border-r border-slate-border bg-surface flex flex-col py-base z-50">
        <div className="px-6 py-6 mb-4 flex flex-col gap-2">
          <h1 className="font-headline-lg text-headline-lg font-bold text-primary tracking-tight">Viafinds</h1>
          <div className="flex items-center gap-3 mt-4">
            <div className="w-10 h-10 rounded-full bg-surface-container-high overflow-hidden border border-slate-border">
              <img className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDwdt5DSXuMpSchNx9b4mIvNh2g3QJ0cunuMmYMQCvBWp0IDpUD4apj_Y0E8yDQQhTXolpwTOFV-1VSZ_CEwl0Rv42FXcPKAHyBuOfrWxScfpBWz8t2eVgHwp7WhfN3A_YiZFy5unpBqRsD-b0D8KDHUxO91zQeiYfhSP1ovxKzvoyFBMhqC3KIlBRJiQUerCTu58tVTejmHSPFPxjAJGVzdeSJM86DTZ9L-0QAWB561iKgK4gTrfbo" alt="Avatar"/>
            </div>
            <div>
              <div className="font-ui-body text-ui-body font-semibold text-on-surface">Viafinds Admin</div>
              <div className="font-mono-data text-mono-data text-on-surface-variant opacity-75">Curation Desk Control</div>
            </div>
          </div>
        </div>
        <ul className="flex flex-col gap-1 px-4 mt-4 flex-1">
          {navItems.map((item) => (
            <li key={item.name}>
              <a 
                className={
                  item.active 
                    ? "flex items-center gap-3 px-4 py-3 text-primary font-bold border-l-4 border-primary bg-surface-container-high transition-colors duration-200 ease-in-out" 
                    : "flex items-center gap-3 px-4 py-3 rounded-DEFAULT text-on-surface-variant font-medium hover:bg-surface-container hover:text-on-surface transition-colors duration-200 ease-in-out"
                } 
                href={item.href}
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span className="font-ui-body text-ui-body">{item.name}</span>
              </a>
            </li>
          ))}
        </ul>
        <div className="px-6 py-4 mt-auto border-t border-slate-border">
          <div className="font-mono-data text-mono-data text-on-surface-variant opacity-50">System Status: Optimal</div>
        </div>
      </nav>
      <main className="ml-sidebar-width flex-1 p-margin-desktop h-screen overflow-y-auto bg-background">
        {children}
      </main>
    </div>
  );
}
