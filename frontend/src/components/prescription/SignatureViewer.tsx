interface Props {
    isValid: boolean;
    medecinNom: string;
    date: string;
    hash: string;
}

export function SignatureViewer({ isValid, medecinNom, date, hash }: Props) {
    return (
        <div className={`border-2 rounded-xl p-5 ${isValid
                ? 'border-green-500 bg-green-50'
                : 'border-red-500 bg-red-50'
            }`}>

            <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{isValid ? '✅' : '❌'}</span>
                <div>
                    <p className={`font-bold text-lg ${isValid ? 'text-green-700' : 'text-red-700'}`}>
                        {isValid ? 'Ordonnance authentique' : 'Signature invalide — ordonnance suspecte'}
                    </p>
                    <p className="text-sm text-gray-500">
                        Signée par Dr. {medecinNom} — {new Date(date).toLocaleString('fr-FR')}
                    </p>
                </div>
            </div>

            <div className="bg-white/60 rounded p-3 font-mono text-xs text-gray-500 break-all">
                <span className="font-semibold">SHA-256 : </span>
                {hash}
            </div>
        </div>
    );
}