import { useSocketConnection } from '../../hooks/useSocket';

export function ConnectionIndicator() {
    const { isConnected } = useSocketConnection();
    if (isConnected) return null;
    return (
        <div className="fixed top-0 w-full bg-yellow-500 text-center py-1 z-[100] text-sm font-medium">
            Connexion temps réel perdue — notifications retardées
        </div>
    );
}
