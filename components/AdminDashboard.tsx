
import React, { useEffect, useState } from 'react';
import { User, InviteCode, ScanLog, Location, Role, GeolocationCoordinates } from '../types';
import { authService } from '../services/authService';
import { getAdminAllLogs } from '../services/firebaseService';
import { locationService } from '../services/locationService';
import { Spinner, CarIcon, ScanIcon, UsersIcon, ClipboardIcon, LogOutIcon, LocationMarkerIcon, TrashIcon, UserPlusIcon, BuildingOfficeIcon, Square2StackIcon, PencilIcon, LockClosedIcon } from './Icons';

interface AdminDashboardProps {
    currentUser: User;
    onLogout: () => void;
}

type Tab = 'overview' | 'users' | 'locations' | 'data';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, onLogout }) => {
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [users, setUsers] = useState<User[]>([]);
    const [invites, setInvites] = useState<InviteCode[]>([]);
    const [logs, setLogs] = useState<ScanLog[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
    
    // Modal States
    const [userModalState, setUserModalState] = useState<{ isOpen: boolean, editingUser: User | null }>({ isOpen: false, editingUser: null });
    const [locationModalState, setLocationModalState] = useState<{ isOpen: boolean, editingLocation: Location | null }>({ isOpen: false, editingLocation: null });
    
    const [processingAction, setProcessingAction] = useState<{ targetId: string, type: 'delete' | 'toggle' | 'revoke' } | null>(null);

    const loadData = async () => {
        // Only show full page loader on initial load, not refreshes
        if (users.length === 0) setIsLoading(true);
        try {
            const [allUsers, allInvites, allLogs, allLocations] = await Promise.all([
                authService.getAllUsers(),
                authService.getAllInvites(),
                getAdminAllLogs(),
                locationService.getLocations()
            ]);
            setUsers(allUsers.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
            setInvites(allInvites);
            setLogs(allLogs);
            setLocations(allLocations);
        } catch (error) {
            console.error("Failed to load admin data", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleGenerateInvite = async () => {
        setIsGeneratingInvite(true);
        try {
            await authService.generateInviteCode(currentUser.id);
            const updatedInvites = await authService.getAllInvites();
            setInvites(updatedInvites);
        } catch (error) {
            alert("Failed to generate invite.");
        } finally {
            setIsGeneratingInvite(false);
        }
    };
    
    // Reusable Top Areas Widget
    const TopAreasWidget = ({ logsData }: { logsData: ScanLog[] }) => {
        const [filter, setFilter] = useState<'today' | 'week' | 'all'>('all');

        const filteredLogs = logsData.filter(log => {
            if (filter === 'today') return log.timestamp.toDateString() === new Date().toDateString();
            if (filter === 'week') {
                const d = new Date();
                d.setDate(d.getDate() - 7);
                d.setHours(0,0,0,0);
                return new Date(log.timestamp) >= d;
            }
            return true;
        });

        const areaMap = filteredLogs.reduce((acc, log) => {
            acc[log.parkingArea] = (acc[log.parkingArea] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const topAreas = Object.entries(areaMap)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);
        
        const maxAreaCount = Math.max(...Object.values(areaMap), 1);

        return (
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-sm h-full flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-white">Top Parking Areas (Activity)</h3>
                    <div className="flex bg-gray-900/50 rounded-lg p-1 border border-gray-700/50">
                        {(['today', 'week', 'all'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3 py-1 text-xs font-medium rounded-md transition-all capitalize ${filter === f ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-gray-300'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
                {topAreas.length > 0 ? (
                    <div className="space-y-4 flex-1">
                        {topAreas.map(([area, count], idx) => (
                                <div key={area} className="flex items-center">
                                <span className="w-6 text-sm text-gray-500 font-mono">#{idx + 1}</span>
                                <div className="flex-1 mx-4">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="font-semibold text-white truncate">{area}</span>
                                        <span className="text-gray-400 text-xs whitespace-nowrap ml-2">{count} scans</span>
                                    </div>
                                    <div className="w-full bg-gray-900/50 rounded-full h-1.5 overflow-hidden">
                                        <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${(count / maxAreaCount) * 100}%` }}></div>
                                    </div>
                                </div>
                                </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center flex-1 text-gray-500 min-h-[150px]">
                        <LocationMarkerIcon className="w-8 h-8 mb-2 opacity-50"/>
                        <p className="text-sm italic">No matching data.</p>
                    </div>
                )}
            </div>
        );
    };

    const UserManagementTab = () => {
        const [userSearch, setUserSearch] = useState('');
        const activeInvites = invites.filter(i => !i.used);

        // KPI Calculations
        const totalUsers = users.length;
        const admins = users.filter(u => u.role === 'admin').length;
        const agents = users.filter(u => u.role === 'agent').length;
        const activeUsers = users.filter(u => u.status === 'active').length;
        const inactiveUsers = totalUsers - activeUsers;

        // Filter users based on search term
        const filteredUsers = users.filter(u => 
            u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
            u.email.toLowerCase().includes(userSearch.toLowerCase())
        );

        const handleAction = async (userId: string, type: 'delete' | 'toggle', action: () => Promise<void>, confirmMessage: string) => {
            if (window.confirm(confirmMessage)) {
                setProcessingAction({ targetId: userId, type });
                try {
                    await action();
                    await loadData(); // Reload all data to reflect changes
                } catch (error: any) {
                    alert(`Action failed: ${error.message}`);
                } finally {
                    setProcessingAction(null);
                }
            }
        };

        const handleRevokeInvite = async (code: string) => {
            setProcessingAction({ targetId: code, type: 'revoke' });
            try {
                await authService.revokeInviteCode(code);
                // Update local state immediately for better UX, although loadData would also work
                setInvites(prev => prev.filter(i => i.code !== code));
            } catch (error) {
                alert("Failed to revoke invite code.");
                loadData(); // Reload to ensure state is synced on error
            } finally {
                setProcessingAction(null);
            }
        };

        const KpiCard = ({ title, value, icon: Icon, color }: any) => (
            <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 flex items-center justify-between shadow-sm">
                <div>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">{title}</p>
                    <p className="text-2xl font-extrabold text-white mt-1">{value}</p>
                </div>
                <div className={`p-3 rounded-lg ${color} bg-opacity-10 text-${color.split('-')[1]}-500`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
        );

        return (
            <div className="space-y-6 animate-fade-in">
                {/* KPI Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <KpiCard title="Total Users" value={totalUsers} icon={UsersIcon} color="bg-blue-500" />
                    <KpiCard title="Administrators" value={admins} icon={LockClosedIcon} color="bg-orange-500" />
                    <KpiCard title="Field Agents" value={agents} icon={CarIcon} color="bg-purple-500" />
                    <KpiCard title="Active Accounts" value={activeUsers} icon={UserPlusIcon} color="bg-green-500" />
                    <KpiCard title="Inactive/Blocked" value={inactiveUsers} icon={LogOutIcon} color="bg-red-500" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* User List Section */}
                    <div className="lg:col-span-2 bg-gray-800 p-6 rounded-xl border border-gray-700 flex flex-col">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                             <h3 className="text-lg font-bold text-white">User Registry</h3>
                             <div className="flex gap-2 w-full sm:w-auto">
                                <input 
                                    type="text" 
                                    placeholder="Search users..." 
                                    value={userSearch}
                                    onChange={e => setUserSearch(e.target.value)}
                                    className="bg-gray-900 border border-gray-600 rounded-md px-3 py-1.5 text-sm text-white focus:ring-primary-500 outline-none w-full sm:w-48"
                                />
                                <button onClick={() => setUserModalState({ isOpen: true, editingUser: null })} className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-md transition-colors whitespace-nowrap">
                                    <UserPlusIcon className="w-4 h-4" /> Create User
                                </button>
                             </div>
                        </div>
                        <div className="overflow-x-auto flex-1">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-xs text-gray-400 uppercase bg-gray-700/30">
                                        <th className="p-3 rounded-l-lg">User</th>
                                        <th className="p-3">Role</th>
                                        <th className="p-3">Status</th>
                                        <th className="p-3">Last Login</th>
                                        <th className="p-3 text-right rounded-r-lg">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700">
                                    {filteredUsers.map(user => (
                                        <tr key={user.id} className="hover:bg-gray-700/30 transition-colors">
                                            <td className="p-3">
                                                <p className="font-semibold text-white">{user.name}</p>
                                                <p className="text-sm text-gray-400">{user.email}</p>
                                            </td>
                                            <td className="p-3">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium capitalize ${
                                                    user.role === 'admin' ? 'bg-orange-900/30 text-orange-300 border border-orange-800/50' : 'bg-purple-900/30 text-purple-300 border border-purple-800/50'
                                                }`}>
                                                    {user.role === 'admin' && <LockClosedIcon className="w-3 h-3 mr-1"/>}
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="p-3">
                                                 <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${user.status === 'active' ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
                                                    {user.status === 'blocked' ? 'Inactive' : user.status}
                                                </span>
                                            </td>
                                            <td className="p-3 text-sm text-gray-300 whitespace-nowrap">
                                                {user.lastLogin ? user.lastLogin.toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : <span className="text-gray-500 italic">Never</span>}
                                            </td>
                                            <td className="p-3 text-right">
                                                {user.id !== currentUser.id && (
                                                    <div className="flex gap-2 justify-end">
                                                        {/* Edit Button */}
                                                        <button 
                                                            onClick={() => setUserModalState({ isOpen: true, editingUser: user })}
                                                            className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded-md transition-colors"
                                                            title="Edit User"
                                                        >
                                                            <PencilIcon className="w-4 h-4"/>
                                                        </button>

                                                        {/* Delete Button */}
                                                        <button 
                                                            onClick={() => handleAction(user.id, 'delete', async () => { await authService.deleteUser(user.id) }, `Permanently DELETE ${user.name}? This action cannot be undone.`)} 
                                                            disabled={!!processingAction}
                                                            className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                            title="Delete User"
                                                        >
                                                            {processingAction?.targetId === user.id && processingAction.type === 'delete' ? (
                                                                <Spinner className="w-4 h-4" />
                                                            ) : (
                                                                <TrashIcon className="w-4 h-4"/>
                                                            )}
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                     {filteredUsers.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-6 text-center text-gray-500 italic">
                                                No users found matching "{userSearch}"
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                     {/* Invite Codes Section */}
                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex flex-col max-h-[600px]">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-white">Active Invite Codes</h3>
                                <p className="text-xs text-gray-400">Codes available for new agents.</p>
                            </div>
                            <button 
                                onClick={handleGenerateInvite} 
                                disabled={isGeneratingInvite}
                                className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-md transition-colors flex items-center shadow-sm"
                            >
                                {isGeneratingInvite ? <Spinner className="w-4 h-4 mr-2"/> : '+ Generate New'}
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 -mr-1">
                            {activeInvites.length > 0 ? (
                                <ul className="space-y-2">
                                    {activeInvites.map(invite => (
                                        <li key={invite.code} className="flex justify-between items-center bg-gray-900/50 p-3 rounded-lg border border-gray-700/50 hover:border-gray-600 transition-colors">
                                            <div className="flex flex-col">
                                                <span className="font-mono text-primary-400 font-bold tracking-wider text-lg">{invite.code}</span>
                                                <span className="text-xs text-gray-500">Created: {new Date(invite.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <button 
                                                onClick={() => handleRevokeInvite(invite.code)}
                                                disabled={processingAction?.targetId === invite.code}
                                                className="px-3 py-1 text-xs font-medium text-red-400 bg-red-900/20 hover:bg-red-900/40 border border-red-900/50 rounded transition-colors disabled:opacity-50"
                                            >
                                                 {processingAction?.targetId === invite.code && processingAction.type === 'revoke' ? (
                                                    <Spinner className="w-4 h-4" />
                                                ) : (
                                                    "Revoke"
                                                )}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-gray-500 h-full">
                                    <ClipboardIcon className="w-10 h-10 mb-3 opacity-30" />
                                    <p className="text-sm italic font-medium">No active codes.</p>
                                    <p className="text-xs mt-1">Generate one to invite agents.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const LocationsTab = () => {
        const [searchTerm, setSearchTerm] = useState('');
        const [filterCountry, setFilterCountry] = useState('All');
        const [filterZone, setFilterZone] = useState('All');
        const [filterHub, setFilterHub] = useState<'All' | 'Yes' | 'No'>('All');
        const [filterStatus, setFilterStatus] = useState<'All' | 'Active' | 'Inactive'>('All');
        const [startDate, setStartDate] = useState('');
        const [endDate, setEndDate] = useState('');

        // Get unique values for filter dropdowns
        const countries = ['All', ...Array.from(new Set(locations.map(loc => loc.address?.country).filter(Boolean)))];
        const zones = ['All', ...Array.from(new Set(locations.map(loc => loc.zone).filter(Boolean)))];

        const filteredLocations = locations.filter(loc => {
            const matchesSearch = (loc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                   loc.address?.city.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesCountry = filterCountry === 'All' || loc.address?.country === filterCountry;
            const matchesZone = filterZone === 'All' || loc.zone === filterZone;
            const matchesHub = filterHub === 'All' || (filterHub === 'Yes' ? loc.isHub : !loc.isHub);
            const matchesStatus = filterStatus === 'All' || (filterStatus === 'Active' ? loc.status === 'active' : loc.status === 'inactive');
            
            let matchesDate = true;
            if (startDate) {
                matchesDate = matchesDate && new Date(loc.createdAt) >= new Date(startDate);
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                matchesDate = matchesDate && new Date(loc.createdAt) <= end;
            }

            return matchesSearch && matchesCountry && matchesZone && matchesHub && matchesStatus && matchesDate;
        });

        // Filter LOGS based on currently visible locations for TopAreasWidget reactivity
        const visibleLocationNames = new Set(filteredLocations.map(l => l.name));
        const logsForVisibleLocations = logs.filter(log => visibleLocationNames.has(log.parkingArea));

        // KPI Calculations
        const displayedLocations = filteredLocations.length;
        const totalCapacity = filteredLocations.reduce((sum, loc) => sum + (loc.capacity || 0), 0);
        const totalArea = filteredLocations.reduce((sum, loc) => sum + (loc.surfaceArea || 0), 0);
        const avgCapacity = displayedLocations > 0 ? Math.round(totalCapacity / displayedLocations) : 0;

        const handleAction = async (locId: string, type: 'delete' | 'toggle', action: () => Promise<void>, confirmMessage: string) => {
            if (window.confirm(confirmMessage)) {
                setProcessingAction({ targetId: locId, type });
                try {
                    await action();
                    await loadData();
                } catch (error: any) {
                    alert(`Action failed: ${error.message}`);
                } finally {
                    setProcessingAction(null);
                }
            }
        };

        const handleEditLocation = (loc: Location) => {
            setLocationModalState({ isOpen: true, editingLocation: loc });
        };

        const exportLocationsToCSV = () => {
            const headers = ["Name", "Street", "City", "Zip Code", "Country", "Latitude", "Longitude", "Zone", "Is Hub", "Status", "Opening Time", "Closing Time", "Capacity", "Surface Area (m²)", "Created At"];
            const rows = filteredLocations.map(loc => [
                loc.name,
                loc.address?.street || '',
                loc.address?.city || '',
                loc.address?.zipCode || '',
                loc.address?.country || '',
                loc.coordinates?.latitude || '',
                loc.coordinates?.longitude || '',
                loc.zone || '',
                loc.isHub ? 'Yes' : 'No',
                loc.status || 'active',
                loc.openingTime || '',
                loc.closingTime || '',
                loc.capacity?.toString() || '0',
                loc.surfaceArea?.toString() || '0',
                new Date(loc.createdAt).toISOString()
            ].map(field => `"${field}"`).join(','));

            const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `locations_export_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };

        const KpiCard = ({ title, value, icon: Icon, color }: any) => (
            <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 flex items-center justify-between shadow-sm">
                <div>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">{title}</p>
                    <p className="text-2xl font-extrabold text-white mt-1">{value}</p>
                </div>
                <div className={`p-3 rounded-lg ${color} bg-opacity-10 text-${color.split('-')[1]}-500`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
        );

        return (
            <div className="space-y-6 animate-fade-in">
                 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <h3 className="text-lg font-bold text-white">Locations Registry</h3>
                    <div className="flex gap-3 w-full md:w-auto">
                        <button onClick={exportLocationsToCSV} disabled={filteredLocations.length === 0} className="flex-1 md:flex-none px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-md transition-colors flex items-center justify-center disabled:bg-gray-600 disabled:text-gray-400">
                            <ClipboardIcon className="w-5 h-5 mr-2"/> Export CSV
                        </button>
                        <button onClick={() => setLocationModalState({ isOpen: true, editingLocation: null })} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-md transition-colors">
                             <LocationMarkerIcon className="w-5 h-5" /> Add Location
                        </button>
                    </div>
                </div>

                {/* KPI Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KpiCard title="Visible Locations" value={displayedLocations} icon={LocationMarkerIcon} color="bg-blue-500" />
                    <KpiCard title="Total Capacity" value={totalCapacity.toLocaleString()} icon={CarIcon} color="bg-green-500" />
                    <KpiCard title="Avg. Capacity" value={avgCapacity.toLocaleString()} icon={BuildingOfficeIcon} color="bg-purple-500" />
                    <KpiCard title="Total Area" value={`${totalArea.toLocaleString()} m²`} icon={Square2StackIcon} color="bg-orange-500" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                     {/* Top Ranking Widget - NOW REACTIVE to filtered logs */}
                    <div className="lg:col-span-1">
                        <TopAreasWidget logsData={logsForVisibleLocations} />
                    </div>

                    {/* Locations Table Container */}
                    <div className="lg:col-span-3 flex flex-col gap-4">
                        {/* Filters Toolbar */}
                        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex flex-wrap gap-4 items-end">
                            <div className="flex-1 min-w-[150px]">
                                <label className="text-xs text-gray-400 font-semibold mb-1 block">Search (Name, City)</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Central" 
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:ring-primary-500 outline-none"
                                />
                            </div>
                            <div className="w-full sm:w-auto">
                                <label className="text-xs text-gray-400 font-semibold mb-1 block">Country</label>
                                <select 
                                    value={filterCountry} 
                                    onChange={e => setFilterCountry(e.target.value)}
                                    className="w-full sm:w-32 bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:ring-primary-500 outline-none"
                                >
                                    {countries.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="w-full sm:w-auto">
                                <label className="text-xs text-gray-400 font-semibold mb-1 block">Zone</label>
                                <select 
                                    value={filterZone} 
                                    onChange={e => setFilterZone(e.target.value)}
                                    className="w-full sm:w-32 bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:ring-primary-500 outline-none"
                                >
                                    {zones.map(z => <option key={z} value={z}>{z}</option>)}
                                </select>
                            </div>
                             <div className="w-full sm:w-auto">
                                <label className="text-xs text-gray-400 font-semibold mb-1 block">Hub</label>
                                <select 
                                    value={filterHub} 
                                    onChange={e => setFilterHub(e.target.value as any)}
                                    className="w-full sm:w-20 bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:ring-primary-500 outline-none"
                                >
                                    <option value="All">All</option>
                                    <option value="Yes">Yes</option>
                                    <option value="No">No</option>
                                </select>
                            </div>
                             <div className="w-full sm:w-auto">
                                <label className="text-xs text-gray-400 font-semibold mb-1 block">Status</label>
                                <select 
                                    value={filterStatus} 
                                    onChange={e => setFilterStatus(e.target.value as any)}
                                    className="w-full sm:w-24 bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:ring-primary-500 outline-none"
                                >
                                    <option value="All">All</option>
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                </select>
                            </div>
                             <div className="flex gap-2 w-full xl:w-auto">
                                <div>
                                    <label className="text-xs text-gray-400 font-semibold mb-1 block">Created From</label>
                                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:ring-primary-500 outline-none"/>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 font-semibold mb-1 block">To</label>
                                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:ring-primary-500 outline-none"/>
                                </div>
                            </div>
                        </div>

                        {/* Locations Table */}
                        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden flex-1 flex flex-col">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-700/50 text-xs uppercase text-gray-400 font-semibold">
                                        <tr>
                                            <th className="p-4">Name / Address</th>
                                            <th className="p-4 hidden sm:table-cell">Location Info</th>
                                            <th className="p-4">Details / HUB</th>
                                            <th className="p-4">Status</th>
                                            <th className="p-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700">
                                        {filteredLocations.map(loc => (
                                            <tr key={loc.id} className="hover:bg-gray-700/30 transition-colors">
                                                <td className="p-4">
                                                    <p className="font-bold text-white text-sm md:text-base">{loc.name}</p>
                                                    <p className="text-xs text-gray-400 mt-1 truncate max-w-[150px] md:max-w-none">
                                                        {loc.address?.street}
                                                    </p>
                                                    {loc.coordinates && (
                                                        <p className="text-[10px] font-mono text-gray-500 mt-1 hidden md:block">
                                                            GPS: {loc.coordinates.latitude.toFixed(4)}, {loc.coordinates.longitude.toFixed(4)}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="p-4 hidden sm:table-cell">
                                                     <p className="text-white text-sm">{loc.address?.city}, {loc.address?.country}</p>
                                                     {loc.zone && <p className="text-xs text-primary-400 font-semibold mt-0.5">Zone: {loc.zone}</p>}
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-col gap-1">
                                                        <div><span className="text-white font-semibold text-sm">{loc.capacity?.toLocaleString() ?? '-'}</span> <span className="text-gray-500 text-xs">spots</span></div>
                                                        {loc.isHub && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-900/50 text-purple-300 w-fit">HUB</span>}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                     <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${loc.status === 'active' ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
                                                        {loc.status || 'active'}
                                                    </span>
                                                    {(loc.openingTime && loc.closingTime) && (
                                                        <p className="text-xs text-gray-500 mt-1">{loc.openingTime} - {loc.closingTime}</p>
                                                    )}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={() => handleEditLocation(loc)} disabled={!!processingAction} className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-md transition-colors disabled:opacity-50" title="Edit Location">
                                                            <PencilIcon className="w-5 h-5" />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleAction(loc.id, 'delete', async () => { await locationService.deleteLocation(loc.id); }, "Are you sure you want to delete this location?")} 
                                                            disabled={!!processingAction}
                                                            className="p-2 text-red-500 hover:bg-red-500/10 rounded-md transition-colors disabled:opacity-50" 
                                                            title="Delete Location"
                                                        >
                                                             {processingAction?.targetId === loc.id && processingAction.type === 'delete' ? (
                                                                <Spinner className="w-5 h-5" />
                                                            ) : (
                                                                <TrashIcon className="w-5 h-5" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredLocations.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="p-8 text-center text-gray-500 italic">
                                                    No locations match your filters.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const DataTab = () => {
        const [filter, setFilter] = useState('');
        const filteredLogs = logs.filter(log => 
            (log.sessionId && log.sessionId.toLowerCase().includes(filter.toLowerCase())) ||
            log.vin.toLowerCase().includes(filter.toLowerCase()) || 
            log.parkingArea.toLowerCase().includes(filter.toLowerCase()) ||
            log.userEmail.toLowerCase().includes(filter.toLowerCase())
        );

        const exportToCSV = () => {
            const headers = ["ID", "SessionID", "VIN", "ParkingArea", "Timestamp", "Latitude", "Longitude", "ImageURL", "EntryMethod", "UserID", "UserEmail"];
            const rows = filteredLogs.map(log => [
                log.id,
                log.sessionId || '',
                log.vin,
                log.parkingArea,
                log.timestamp.toISOString(),
                log.location.latitude,
                log.location.longitude,
                log.imageUrl || '',
                log.entryMethod,
                log.userId,
                log.userEmail
            ].map(String).join(','));

            const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `scan_data_export_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };

        return (
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden flex flex-col h-[calc(100vh-220px)]">
                <div className="p-4 border-b border-gray-700 flex flex-wrap gap-2 justify-between items-center bg-gray-800 sticky top-0 z-10">
                    <h3 className="text-lg font-bold text-white">All Scan Logs ({logs.length})</h3>
                    <div className="flex gap-2 items-center">
                        <input 
                            type="text" 
                            placeholder="Filter by Session ID, VIN, Area, or Agent..." 
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                            className="bg-gray-900 border border-gray-600 rounded-md px-3 py-1.5 text-sm text-white focus:ring-primary-500 outline-none w-72"
                        />
                        <button onClick={exportToCSV} disabled={filteredLogs.length === 0} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-md disabled:bg-gray-500">
                            Export CSV
                        </button>
                    </div>
                </div>
                <div className="overflow-auto flex-1">
                     <table className="w-full text-left whitespace-nowrap">
                        <thead className="sticky top-0 bg-gray-700 text-xs uppercase text-gray-400 font-semibold">
                            <tr>
                                <th className="p-3">Time</th>
                                <th className="p-3">Session ID</th>
                                <th className="p-3">VIN</th>
                                <th className="p-3">Area</th>
                                <th className="p-3">Agent</th>
                                <th className="p-3">Method</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {filteredLogs.map(log => (
                                <tr key={log.id} className="hover:bg-gray-700/30 transition-colors">
                                    <td className="p-3 text-sm text-gray-300">{log.timestamp.toLocaleString()}</td>
                                    <td className="p-3 text-xs font-mono text-gray-400">{log.sessionId}</td>
                                    <td className="p-3 font-mono text-white">{log.vin}</td>
                                    <td className="p-3 text-sm text-gray-300">{log.parkingArea}</td>
                                    <td className="p-3 text-sm text-primary-400">{log.userEmail}</td>
                                    <td className="p-3 text-sm">
                                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                                            log.entryMethod === 'Camera' ? 'bg-blue-900/50 text-blue-300' :
                                            log.entryMethod === 'Video' ? 'bg-purple-900/50 text-purple-300' :
                                            log.entryMethod === 'Upload' ? 'bg-green-900/50 text-green-300' :
                                            'bg-gray-700 text-gray-300'
                                        }`}>
                                            {log.entryMethod}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const OverviewTab = () => {
        const [trendTab, setTrendTab] = useState<'daily' | 'hourly'>('daily');

        // --- Data Processing ---
        const now = new Date();
        const todayStr = now.toDateString();
        const todayLogs = logs.filter(l => l.timestamp.toDateString() === todayStr);

        // KPIs
        const totalScans = logs.length;
        const scansToday = todayLogs.length;
        const sessionsToday = new Set(todayLogs.map(l => l.sessionId)).size;
        const activeAgentsToday = new Set(todayLogs.map(l => l.userId)).size;
        const activeAreasToday = new Set(todayLogs.map(l => l.parkingArea)).size;

        // 7-Day Trend (Daily)
        const last7Days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d;
        });
        const trendDataDaily = last7Days.map(date => {
            const dateStr = date.toDateString();
            const count = logs.filter(l => l.timestamp.toDateString() === dateStr).length;
            return {
                day: date.toLocaleDateString('en-US', { weekday: 'short' }),
                date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                count
            };
        });
        const maxTrendCountDaily = Math.max(...trendDataDaily.map(d => d.count), 1);

        // 7-Day Trend (Hourly - Peak Activity)
        const hourlyCounts = new Array(24).fill(0);
        logs.filter(l => {
             const logDate = new Date(l.timestamp);
             const sevenDaysAgo = new Date();
             sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
             sevenDaysAgo.setHours(0,0,0,0);
             return logDate >= sevenDaysAgo;
        }).forEach(log => {
             const hour = new Date(log.timestamp).getHours();
             hourlyCounts[hour]++;
        });
        const maxHourlyCount = Math.max(...hourlyCounts, 1);

        // Method Distribution
        const methodCounts = {
            Camera: logs.filter(l => l.entryMethod === 'Camera').length,
            Video: logs.filter(l => l.entryMethod === 'Video').length,
            Upload: logs.filter(l => l.entryMethod === 'Upload').length,
            Manual: logs.filter(l => l.entryMethod === 'Manual').length,
        };
        const getTotal = (sum: number, num: number) => sum + num;
        const totalMethods = Object.values(methodCounts).reduce(getTotal, 0) || 1;

        // --- Components ---
        const KpiCard = ({ title, value, subtitle, icon: Icon, color }: any) => (
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-sm flex items-start justify-between transition-all hover:border-gray-600">
                <div>
                    <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">{title}</p>
                    <p className="text-3xl font-extrabold text-white mt-2">{value}</p>
                    {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
                </div>
                <div className={`p-3 rounded-lg ${color} bg-opacity-10 text-${color.split('-')[1]}-500`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
        );

        return (
             <div className="space-y-6 animate-fade-in">
                {/* KPI Row - 5 columns for large screens */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                    <KpiCard title="Total Scans" value={totalScans.toLocaleString()} subtitle="All-time historical data" icon={ClipboardIcon} color="bg-blue-500" />
                    <KpiCard title="Scans Today" value={scansToday.toLocaleString()} subtitle={now.toLocaleDateString()} icon={CarIcon} color="bg-green-500" />
                    <KpiCard title="Sessions Today" value={sessionsToday.toLocaleString()} subtitle="Unique check-ins" icon={ScanIcon} color="bg-indigo-500" />
                    <KpiCard title="Active Areas" value={activeAreasToday} subtitle="Visited today" icon={LocationMarkerIcon} color="bg-orange-500" />
                    <KpiCard title="Active Agents" value={activeAgentsToday} subtitle="Working today" icon={UsersIcon} color="bg-purple-500" />
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {/* Multi-tab Trend Widget */}
                    <div className="xl:col-span-2 bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-sm flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-white">
                                {trendTab === 'daily' ? '7-Day Scan Trend' : 'Peak Activity (Last 7 Days)'}
                            </h3>
                            <div className="flex bg-gray-900/50 rounded-lg p-1 border border-gray-700/50">
                                <button 
                                    onClick={() => setTrendTab('daily')} 
                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${trendTab === 'daily' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-gray-300'}`}
                                >
                                    Daily
                                </button>
                                <button 
                                    onClick={() => setTrendTab('hourly')} 
                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${trendTab === 'hourly' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-gray-300'}`}
                                >
                                    Hourly
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex-1 flex items-end gap-2 h-64 min-h-[16rem]">
                            {trendTab === 'daily' ? (
                                // DAILY CHART
                                trendDataDaily.map((data, idx) => (
                                    <div key={idx} className="flex-1 flex flex-col items-center group">
                                        <div className="relative flex-1 w-full flex items-end px-1 sm:px-2">
                                             <div
                                                className="w-full bg-primary-600/80 rounded-t-md hover:bg-primary-500 transition-all duration-300 relative group-hover:shadow-lg group-hover:shadow-primary-900/50"
                                                style={{ height: `${(data.count / maxTrendCountDaily) * 100}%` }}
                                            >
                                                <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-gray-700 z-10">
                                                    {data.count} scans
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-400 mt-3 text-center font-medium">
                                            <div className="uppercase">{data.day}</div>
                                            <div className="text-gray-500 font-light scale-90 hidden sm:block">{data.date}</div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                // HOURLY CHART (Peak Activity)
                                hourlyCounts.map((count, hour) => (
                                    <div key={hour} className="flex-1 flex flex-col items-center group">
                                        <div className="relative flex-1 w-full flex items-end px-[1px] sm:px-0.5">
                                             <div
                                                className={`w-full rounded-t-sm hover:bg-indigo-400 transition-all duration-300 relative ${count > 0 ? 'bg-indigo-600/80' : 'bg-gray-800'}`}
                                                style={{ height: `${Math.max((count / maxHourlyCount) * 100, 2)}%` }}
                                            >
                                                 {count > 0 && (
                                                    <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-gray-700 z-50">
                                                        {hour}:00 - {hour + 1}:00<br/>{count} scans
                                                    </span>
                                                 )}
                                            </div>
                                        </div>
                                        <div className="text-[10px] text-gray-500 mt-3 text-center font-medium h-4">
                                            {hour % 3 === 0 ? `${hour}` : ''}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Entry Method Distribution */}
                     <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-sm">
                        <h3 className="text-lg font-bold text-white mb-6">Entry Method Distribution</h3>
                        <div className="space-y-6">
                            {Object.entries(methodCounts).map(([method, count]) => {
                                const percent = ((count / totalMethods) * 100).toFixed(1);
                                let colorClass = 'bg-gray-500';
                                if (method === 'Camera') colorClass = 'bg-blue-500';
                                if (method === 'Video') colorClass = 'bg-purple-500';
                                if (method === 'Upload') colorClass = 'bg-green-500';
                                if (method === 'Manual') colorClass = 'bg-yellow-500';

                                return (
                                    <div key={method}>
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="text-gray-300 font-medium">{method}</span>
                                            <span className="text-gray-400"><span className="text-white font-bold">{count}</span> ({percent}%)</span>
                                        </div>
                                        <div className="w-full bg-gray-900/50 rounded-full h-2.5 overflow-hidden">
                                            <div className={`h-2.5 rounded-full ${colorClass} transition-all duration-500`} style={{ width: `${percent}%` }}></div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* Bottom Row */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                     {/* Top Areas - Uses newly created Reusable Widget */}
                     <TopAreasWidget logsData={logs} />

                    {/* Recent Activity */}
                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-sm flex flex-col">
                         <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-white">Live Activity Feed</h3>
                            <button onClick={() => setActiveTab('data')} className="text-xs text-primary-400 hover:text-primary-300">View All &rarr;</button>
                         </div>
                         <div className="flex-1 overflow-y-auto pr-2 space-y-3 max-h-[18rem] custom-scrollbar">
                            {logs.slice(0, 10).map(log => (
                                <div key={log.id} className="flex items-start p-3 bg-gray-900/30 rounded-lg border border-gray-700/30 hover:bg-gray-900/50 transition-colors">
                                    <div className={`mt-1.5 w-2.5 h-2.5 rounded-full mr-3 flex-shrink-0 ${
                                        log.entryMethod === 'Camera' ? 'bg-blue-500' :
                                        log.entryMethod === 'Video' ? 'bg-purple-500' :
                                        log.entryMethod === 'Upload' ? 'bg-green-500' : 'bg-yellow-500'
                                    }`}></div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-200 truncate">
                                            <span className="font-bold text-primary-400 font-mono">{log.vin}</span> at <span className="font-semibold text-white">{log.parkingArea}</span>
                                        </p>
                                        <div className="flex justify-between items-center mt-1">
                                             <p className="text-xs text-gray-500 truncate">by {log.userEmail.split('@')[0]}</p>
                                             <p className="text-xs text-gray-500 whitespace-nowrap ml-2">{log.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                             {logs.length === 0 && <p className="text-gray-500 text-sm italic text-center py-4">No recent activity to display.</p>}
                         </div>
                    </div>
                </div>
            </div>
        );
    };

    if (isLoading) {
        return <div className="h-screen flex items-center justify-center"><Spinner className="w-12 h-12 text-primary-500"/></div>;
    }

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col">
            <header className="bg-gray-800 shadow-md border-b border-gray-700 px-6 py-4 flex justify-between items-center">
                <div className="flex items-center">
                    <div className="bg-red-900/30 text-red-400 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider mr-4 border border-red-900/50">
                        Admin Mode
                    </div>
                    <h1 className="text-xl font-bold text-white">Stock Control Dashboard</h1>
                </div>
                <div className="flex items-center gap-4">
                     <span className="text-gray-300 text-sm hidden sm:inline">Welcome, {currentUser.name}</span>
                     <button onClick={onLogout} className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-700 transition-colors" title="Logout">
                        <LogOutIcon className="w-6 h-6"/>
                     </button>
                </div>
            </header>

            <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
                <nav className="bg-gray-800/50 w-full sm:w-64 border-r border-gray-700 p-4 flex-shrink-0">
                    <ul className="flex sm:flex-col gap-2">
                        <li>
                            <button onClick={() => setActiveTab('overview')} className={`w-full flex items-center p-3 rounded-lg transition-colors ${activeTab === 'overview' ? 'bg-primary-900/50 text-primary-400 font-semibold' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}>
                                <ClipboardIcon className="w-5 h-5 mr-3" /> Overview
                            </button>
                        </li>
                         <li>
                            <button onClick={() => setActiveTab('users')} className={`w-full flex items-center p-3 rounded-lg transition-colors ${activeTab === 'users' ? 'bg-primary-900/50 text-primary-400 font-semibold' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}>
                                <UsersIcon className="w-5 h-5 mr-3" /> User Management
                            </button>
                        </li>
                         <li>
                            <button onClick={() => setActiveTab('locations')} className={`w-full flex items-center p-3 rounded-lg transition-colors ${activeTab === 'locations' ? 'bg-primary-900/50 text-primary-400 font-semibold' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}>
                                <LocationMarkerIcon className="w-5 h-5 mr-3" /> Locations
                            </button>
                        </li>
                        <li>
                            <button onClick={() => setActiveTab('data')} className={`w-full flex items-center p-3 rounded-lg transition-colors ${activeTab === 'data' ? 'bg-primary-900/50 text-primary-400 font-semibold' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}>
                                <ScanIcon className="w-5 h-5 mr-3" /> All Scan Data
                            </button>
                        </li>
                    </ul>
                </nav>

                <main className="flex-1 p-6 overflow-y-auto">
                    {activeTab === 'overview' && <OverviewTab />}
                    {activeTab === 'users' && <UserManagementTab />}
                    {activeTab === 'locations' && <LocationsTab />}
                    {activeTab === 'data' && <DataTab />}
                </main>
            </div>
            {userModalState.isOpen && (
                <UserModal 
                    onClose={() => setUserModalState({ isOpen: false, editingUser: null })} 
                    onSuccess={loadData}
                    initialData={userModalState.editingUser}
                />
            )}
            {locationModalState.isOpen && (
                <LocationModal 
                    onClose={() => setLocationModalState({ isOpen: false, editingLocation: null })} 
                    onSuccess={loadData} 
                    currentUser={currentUser}
                    initialData={locationModalState.editingLocation}
                />
            )}
        </div>
    );
};

const UserModal = ({ onClose, onSuccess, initialData }: { onClose: () => void, onSuccess: () => void, initialData: User | null }) => {
    const isEditMode = !!initialData;
    const [name, setName] = useState(initialData?.name || '');
    const [email, setEmail] = useState(initialData?.email || '');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<Role>(initialData?.role || 'agent');
    const [status, setStatus] = useState<'active' | 'blocked'>(initialData?.status || 'active');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            if (isEditMode && initialData) {
                 await authService.updateUser(initialData.id, { name, email, password: password || undefined, role, status });
            } else {
                 await authService.createUser({ name, email, password, role });
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-2xl p-6 w-full max-w-md animate-fade-in">
                <h2 className="text-xl font-bold mb-4 text-white">{isEditMode ? 'Edit User' : 'Create New User'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                     <div>
                        <label className="text-sm text-gray-400">Full Name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full bg-gray-900 p-2 rounded-md border border-gray-600 text-white focus:border-primary-500 outline-none" />
                    </div>
                     <div>
                        <label className="text-sm text-gray-400">Email</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-gray-900 p-2 rounded-md border border-gray-600 text-white focus:border-primary-500 outline-none" />
                    </div>
                     <div>
                        <label className="text-sm text-gray-400">Password {isEditMode && <span className="text-gray-500 font-normal">(leave blank to keep current)</span>}</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required={!isEditMode} className="w-full bg-gray-900 p-2 rounded-md border border-gray-600 text-white focus:border-primary-500 outline-none" placeholder={isEditMode ? "••••••••" : ""} />
                    </div>
                     <div>
                        <label className="text-sm text-gray-400">Role</label>
                        <select value={role} onChange={e => setRole(e.target.value as Role)} className="w-full bg-gray-900 p-2 rounded-md border border-gray-600 text-white focus:border-primary-500 outline-none">
                            <option value="agent">Agent</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    {isEditMode && (
                         <div>
                            <label className="text-sm text-gray-400">Account Status</label>
                            <select value={status} onChange={e => setStatus(e.target.value as 'active' | 'blocked')} className="w-full bg-gray-900 p-2 rounded-md border border-gray-600 text-white focus:border-primary-500 outline-none">
                                <option value="active">Active</option>
                                <option value="blocked">Deactivated (Blocked)</option>
                            </select>
                        </div>
                    )}
                    {error && <p className="text-red-400 text-sm">{error}</p>}
                    <div className="flex gap-4 pt-4">
                        <button type="button" onClick={onClose} className="w-full py-2 bg-gray-600 hover:bg-gray-500 rounded-md text-white transition-colors">Cancel</button>
                        <button type="submit" disabled={isLoading} className="w-full py-2 bg-primary-600 hover:bg-primary-700 rounded-md disabled:bg-gray-500 flex justify-center text-white transition-colors">{isLoading ? <Spinner className="w-5 h-5"/> : (isEditMode ? 'Update' : 'Create')}</button>
                    </div>
                </form>
            </div>
        </div>
    )
}

const LocationModal = ({ onClose, onSuccess, currentUser, initialData }: { onClose: () => void, onSuccess: () => void, currentUser: User, initialData: Location | null }) => {
    const isEditMode = !!initialData;
    const [name, setName] = useState(initialData?.name || '');
    const [street, setStreet] = useState(initialData?.address?.street || '');
    const [city, setCity] = useState(initialData?.address?.city || '');
    const [zipCode, setZipCode] = useState(initialData?.address?.zipCode || '');
    const [country, setCountry] = useState(initialData?.address?.country || '');
    
    // New Coordinates State
    const [latitude, setLatitude] = useState(initialData?.coordinates?.latitude.toString() || '');
    const [longitude, setLongitude] = useState(initialData?.coordinates?.longitude.toString() || '');

    const [capacity, setCapacity] = useState(initialData?.capacity?.toString() || '');
    const [surfaceArea, setSurfaceArea] = useState(initialData?.surfaceArea?.toString() || '');
    const [zone, setZone] = useState(initialData?.zone || '');
    const [isHub, setIsHub] = useState(initialData?.isHub || false);
    const [openingTime, setOpeningTime] = useState(initialData?.openingTime || '');
    const [closingTime, setClosingTime] = useState(initialData?.closingTime || '');
    const [status, setStatus] = useState<'active' | 'inactive'>(initialData?.status || 'active');

    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isGettingLocation, setIsGettingLocation] = useState(false);

    // Reset form if initialData changes
    useEffect(() => {
        if (initialData) {
             setName(initialData.name);
             setStreet(initialData.address?.street || '');
             setCity(initialData.address?.city || '');
             setZipCode(initialData.address?.zipCode || '');
             setCountry(initialData.address?.country || '');
             setLatitude(initialData.coordinates?.latitude.toString() || '');
             setLongitude(initialData.coordinates?.longitude.toString() || '');
             setCapacity(initialData.capacity?.toString() || '');
             setSurfaceArea(initialData.surfaceArea?.toString() || '');
             setZone(initialData.zone || '');
             setIsHub(initialData.isHub || false);
             setOpeningTime(initialData.openingTime || '');
             setClosingTime(initialData.closingTime || '');
             setStatus(initialData.status || 'active');
        } else {
             // Reset for add mode
             setLatitude('');
             setLongitude('');
             setStatus('active');
        }
    }, [initialData]);

    const handleGetCurrentLocation = () => {
        setIsGettingLocation(true);
        setError('');
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser.');
            setIsGettingLocation(false);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLatitude(position.coords.latitude.toFixed(6));
                setLongitude(position.coords.longitude.toFixed(6));
                setIsGettingLocation(false);
            },
            (err) => {
                setError(`Could not get location: ${err.message}`);
                setIsGettingLocation(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleOpenGoogleMaps = () => {
        let query = '';
        if (latitude && longitude) {
            query = `${latitude},${longitude}`;
        } else if (street && city && country) {
             query = `${street}, ${city}, ${country}`;
        }

        if (query) {
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank');
        } else {
            setError('Enter an address or coordinates first to open Google Maps.');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!name || !street || !city || !zipCode || !country) {
             setError("All name and address fields are mandatory.");
             return;
        }

        // Optional: Validate coordinates if provided
        let coordinates: GeolocationCoordinates | undefined;
        if (latitude && longitude) {
            const lat = parseFloat(latitude);
            const lng = parseFloat(longitude);
            if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                setError("Invalid Latitude or Longitude values.");
                return;
            }
            coordinates = { latitude: lat, longitude: lng };
        }

        setIsLoading(true);
        try {
            const locationData = {
                name,
                address: { street, city, zipCode, country },
                coordinates,
                capacity: parseInt(capacity) || 0,
                surfaceArea: parseInt(surfaceArea) || 0,
                zone,
                isHub,
                openingTime,
                closingTime,
                status
            };

            if (isEditMode && initialData) {
                await locationService.updateLocation(initialData.id, locationData);
            } else {
                await locationService.addLocation(locationData, currentUser.id);
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-2xl p-6 w-full max-w-lg animate-fade-in max-h-[90vh] overflow-y-auto custom-scrollbar">
                <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2 sticky top-0 bg-gray-800 z-10 py-2">
                    <LocationMarkerIcon className="w-6 h-6 text-primary-500"/> {isEditMode ? 'Edit Location' : 'Add New Location'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                     <div>
                        <label className="text-sm text-gray-400 font-medium">Location Name *</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full bg-gray-900 p-2.5 rounded-md border border-gray-600 text-white focus:border-primary-500 outline-none mt-1" placeholder="e.g., Central Parking A" />
                    </div>
                    
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 border-b border-gray-700 pb-1">Address Details</p>
                        <div className="space-y-3">
                            <div>
                                <label className="text-sm text-gray-400">Street Address *</label>
                                <input type="text" value={street} onChange={e => setStreet(e.target.value)} required className="w-full bg-gray-900 p-2.5 rounded-md border border-gray-600 text-white focus:border-primary-500 outline-none mt-1" placeholder="123 Main St" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-gray-400">City *</label>
                                    <input type="text" value={city} onChange={e => setCity(e.target.value)} required className="w-full bg-gray-900 p-2.5 rounded-md border border-gray-600 text-white focus:border-primary-500 outline-none mt-1" />
                                </div>
                                <div>
                                    <label className="text-sm text-gray-400">Zip / Postal Code *</label>
                                    <input type="text" value={zipCode} onChange={e => setZipCode(e.target.value)} required className="w-full bg-gray-900 p-2.5 rounded-md border border-gray-600 text-white focus:border-primary-500 outline-none mt-1" />
                                </div>
                            </div>
                             <div>
                                <label className="text-sm text-gray-400">Country *</label>
                                <input type="text" value={country} onChange={e => setCountry(e.target.value)} required className="w-full bg-gray-900 p-2.5 rounded-md border border-gray-600 text-white focus:border-primary-500 outline-none mt-1" />
                            </div>
                        </div>
                    </div>

                    {/* GPS Coordinates Section */}
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 border-b border-gray-700 pb-1">Geographic Coordinates</p>
                        <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                                <label className="text-sm text-gray-400">Latitude</label>
                                <input type="text" value={latitude} onChange={e => setLatitude(e.target.value)} className="w-full bg-gray-900 p-2.5 rounded-md border border-gray-600 text-white focus:border-primary-500 outline-none mt-1 font-mono" placeholder="e.g. 40.7128" />
                            </div>
                            <div>
                                <label className="text-sm text-gray-400">Longitude</label>
                                <input type="text" value={longitude} onChange={e => setLongitude(e.target.value)} className="w-full bg-gray-900 p-2.5 rounded-md border border-gray-600 text-white focus:border-primary-500 outline-none mt-1 font-mono" placeholder="e.g. -74.0060" />
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button type="button" onClick={handleGetCurrentLocation} disabled={isGettingLocation} className="flex-1 py-2 px-3 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-medium rounded-md transition-colors flex items-center justify-center disabled:opacity-50">
                                {isGettingLocation ? <Spinner className="w-4 h-4 mr-2" /> : <LocationMarkerIcon className="w-4 h-4 mr-2" />}
                                Use Current Location
                            </button>
                            <button type="button" onClick={handleOpenGoogleMaps} className="flex-1 py-2 px-3 bg-blue-900/30 hover:bg-blue-900/50 text-blue-300 text-sm font-medium rounded-md transition-colors flex items-center justify-center border border-blue-800/50">
                                Open Google Maps ↗
                            </button>
                        </div>
                    </div>

                    <div>
                         <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 border-b border-gray-700 pb-1">Operational Properties</p>
                         <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                                <label className="text-sm text-gray-400">Zone / District</label>
                                <input type="text" value={zone} onChange={e => setZone(e.target.value)} className="w-full bg-gray-900 p-2.5 rounded-md border border-gray-600 text-white focus:border-primary-500 outline-none mt-1" placeholder="e.g., Downtown" />
                            </div>
                            <div>
                                <label className="text-sm text-gray-400">Operational Status</label>
                                 <select 
                                    value={status} 
                                    onChange={e => setStatus(e.target.value as 'active' | 'inactive')}
                                    className="w-full bg-gray-900 p-2.5 rounded-md border border-gray-600 text-white focus:border-primary-500 outline-none mt-1"
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex items-center p-3 bg-gray-900/50 rounded-lg border border-gray-700/50 mb-4">
                                <input 
                                id="isHub" 
                                type="checkbox" 
                                checked={isHub} 
                                onChange={e => setIsHub(e.target.checked)} 
                                className="w-5 h-5 text-primary-600 rounded border-gray-600 focus:ring-primary-500 bg-gray-800"
                            />
                            <label htmlFor="isHub" className="ml-3 text-sm font-medium text-white cursor-pointer">
                                Main Hub Location
                            </label>
                        </div>

                         <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                                <label className="text-sm text-gray-400">Capacity (Vehicles)</label>
                                <input type="number" min="0" value={capacity} onChange={e => setCapacity(e.target.value)} className="w-full bg-gray-900 p-2.5 rounded-md border border-gray-600 text-white focus:border-primary-500 outline-none mt-1" placeholder="0" />
                            </div>
                            <div>
                                <label className="text-sm text-gray-400">Surface Area (m²)</label>
                                <input type="number" min="0" value={surfaceArea} onChange={e => setSurfaceArea(e.target.value)} className="w-full bg-gray-900 p-2.5 rounded-md border border-gray-600 text-white focus:border-primary-500 outline-none mt-1" placeholder="0" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                                <label className="text-sm text-gray-400">Opening Time</label>
                                <input type="time" value={openingTime} onChange={e => setOpeningTime(e.target.value)} className="w-full bg-gray-900 p-2.5 rounded-md border border-gray-600 text-white focus:border-primary-500 outline-none mt-1" />
                            </div>
                            <div>
                                <label className="text-sm text-gray-400">Closing Time</label>
                                <input type="time" value={closingTime} onChange={e => setClosingTime(e.target.value)} className="w-full bg-gray-900 p-2.5 rounded-md border border-gray-600 text-white focus:border-primary-500 outline-none mt-1" />
                            </div>
                        </div>
                    </div>

                    {error && <p className="text-red-400 text-sm bg-red-900/20 p-3 rounded-lg border border-red-900/50 text-center">{error}</p>}
                    
                    <div className="flex gap-4 pt-4 sticky bottom-0 bg-gray-800 py-4 border-t border-gray-700 mt-4">
                        <button type="button" onClick={onClose} className="w-full py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-semibold transition-colors">Cancel</button>
                        <button type="submit" disabled={isLoading} className="w-full py-3 bg-primary-600 hover:bg-primary-700 rounded-lg disabled:bg-gray-500 flex justify-center text-white font-bold transition-colors">{isLoading ? <Spinner className="w-5 h-5"/> : (isEditMode ? 'Update Location' : 'Add Location')}</button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default AdminDashboard;
