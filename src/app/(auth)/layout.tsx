export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 selection:bg-red-100 selection:text-red-900 font-sans">
            {children}
        </div>
    );
}
