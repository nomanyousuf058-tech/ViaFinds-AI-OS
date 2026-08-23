export default function Footer() {
  return (
    <footer className="border-t border-viafinds-border mt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-center text-sm text-viafinds-muted">
          &copy; {new Date().getFullYear()} Viafinds. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
