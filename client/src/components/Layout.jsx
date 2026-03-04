import Sidebar from './Sidebar';
import Navbar from './Navbar';

const Layout = ({ children }) => {
    return (
        <div className="app-layout">
            <Sidebar />
            <Navbar />
            <main className="main-content">
                <div className="page-content">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
