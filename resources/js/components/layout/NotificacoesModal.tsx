import { useEffect, useState } from 'react';
import { Bell, ShoppingCart, AlertTriangle, CreditCard, CheckCheck, Clock } from 'lucide-react';
import { fiadosApi, clientesApi, pagamentosApi } from '@/lib/api/index';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatBRL, formatDate } from '@/lib/format';

type NotifType = 'compra' | 'inadimplente' | 'pagamento' | 'vencimento';

interface Notif {
    id: string;
    type: NotifType;
    title: string;
    description: string;
    time: string;
    value?: number;
    link?: string;
}

interface Props {
    open: boolean;
    onClose: () => void;
}

const TIPO_ICON: Record<NotifType, React.ReactNode> = {
    compra: <ShoppingCart className="w-4 h-4" />,
    inadimplente: <AlertTriangle className="w-4 h-4" />,
    pagamento: <CreditCard className="w-4 h-4" />,
    vencimento: <Clock className="w-4 h-4" />,
};

const TIPO_COLOR: Record<NotifType, string> = {
    compra: 'bg-primary/10 text-primary',
    inadimplente: 'bg-destructive/10 text-destructive',
    pagamento: 'bg-green-500/10 text-green-600',
    vencimento: 'bg-warning/10 text-warning',
};

function tempoRelativo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 60) return `há ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `há ${h}h`;
    return `há ${Math.floor(h / 24)}d`;
}

export const NotificacoesModal = ({ open, onClose }: Props) => {
    const [notifs, setNotifs] = useState<Notif[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtro, setFiltro] = useState<NotifType | 'all'>('all');

    useEffect(() => {
        if (!open) return;

        const fetch = async () => {
            setLoading(true);
            const lista: Notif[] = [];

            const cutoff48 = Date.now() - 48 * 60 * 60 * 1000;
            const cutoff24 = Date.now() - 24 * 60 * 60 * 1000;
            const cutoff30d = Date.now() - 30 * 24 * 60 * 60 * 1000;

            try {
                const [fiadosResp, inadResp, pagsResp] = await Promise.all([
                    fiadosApi.list({ per_page: 1000 }),
                    clientesApi.list({ status: 'inadimplente', per_page: 100 }),
                    pagamentosApi.list({ estornado: false, per_page: 100 }),
                ]);

                fiadosResp.data
                    .filter(f => new Date(f.created_at).getTime() >= cutoff48)
                    .slice(0, 20)
                    .forEach(f => {
                        lista.push({
                            id: `compra_${f.id}`,
                            type: 'compra',
                            title: 'Nova compra fiada',
                            description: `${f.cliente?.nome || 'Cliente'} – ${f.descricao || 'sem descrição'}`,
                            time: f.created_at,
                            value: Number(f.valor_total),
                            link: `/fiados/${f.id}`,
                        });
                    });

                inadResp.data.slice(0, 15).forEach(c => {
                    lista.push({
                        id: `inad_${c.id}`,
                        type: 'inadimplente',
                        title: 'Cliente inadimplente',
                        description: `${c.nome} está marcado como inadimplente`,
                        time: new Date().toISOString(),
                    });
                });

                pagsResp.data
                    .filter(p => new Date(p.created_at).getTime() >= cutoff24)
                    .slice(0, 20)
                    .forEach(p => {
                        const cliente = p.fiado?.cliente?.nome || 'Cliente';
                        lista.push({
                            id: `pag_${p.id}`,
                            type: 'pagamento',
                            title: 'Pagamento recebido',
                            description: `${cliente} pagou via ${p.metodo}`,
                            time: p.created_at,
                            value: Number(p.valor),
                        });
                    });

                fiadosResp.data
                    .filter(f => f.status !== 'pago' && new Date(f.created_at).getTime() <= cutoff30d)
                    .slice(0, 20)
                    .forEach(f => {
                        const saldo = Number(f.valor_total) - Number(f.valor_pago);
                        if (saldo <= 0) return;
                        lista.push({
                            id: `venc_${f.id}`,
                            type: 'vencimento',
                            title: 'Fiado em atraso',
                            description: `${f.cliente?.nome || 'Cliente'} – aberto desde ${formatDate(f.created_at)}`,
                            time: f.created_at,
                            value: saldo,
                            link: `/fiados/${f.id}`,
                        });
                    });
            } catch {
                // silencioso — modal mostra "tudo em dia"
            }

            lista.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
            setNotifs(lista);
            setLoading(false);
        };

        fetch();
    }, [open]);

    const filtradas = filtro === 'all' ? notifs : notifs.filter(n => n.type === filtro);
    const counts: Record<NotifType, number> = { compra: 0, inadimplente: 0, pagamento: 0, vencimento: 0 };
    notifs.forEach(n => counts[n.type]++);

    const FILTROS: { value: NotifType | 'all'; label: string }[] = [
        { value: 'all', label: `Todas (${notifs.length})` },
        { value: 'compra', label: `Compras (${counts.compra})` },
        { value: 'inadimplente', label: `Inadimplentes (${counts.inadimplente})` },
        { value: 'pagamento', label: `Pagamentos (${counts.pagamento})` },
        { value: 'vencimento', label: `Atrasos (${counts.vencimento})` },
    ];

    return (
        <Dialog open={open} onOpenChange={v => !v && onClose()}>
            <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col p-0">
                <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="flex items-center gap-2">
                                <Bell className="w-5 h-5 text-primary" /> Notificações
                            </DialogTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">{notifs.length} alertas encontrados</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-3">
                        {FILTROS.map(f => (
                            <button
                                key={f.value}
                                onClick={() => setFiltro(f.value)}
                                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${filtro === f.value
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                    }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center items-center py-16">
                            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : filtradas.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                            <CheckCheck className="w-10 h-10 mb-3 opacity-30" />
                            <p className="text-sm font-medium">Tudo em dia!</p>
                            <p className="text-xs mt-1">Nenhuma notificação nesta categoria</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {filtradas.map(n => (
                                <div key={n.id} className="flex gap-3 px-5 py-3.5 hover:bg-muted/40 transition-colors">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${TIPO_COLOR[n.type]}`}>
                                        {TIPO_ICON[n.type]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="text-sm font-medium leading-snug">{n.title}</p>
                                            <span className="text-[10px] text-muted-foreground shrink-0">{tempoRelativo(n.time)}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{n.description}</p>
                                        {n.value != null && (
                                            <p className={`text-xs font-semibold mt-1 ${n.type === 'pagamento' ? 'text-green-600' : n.type === 'vencimento' ? 'text-destructive' : 'text-primary'}`}>
                                                {formatBRL(n.value)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export const useNotifCount = () => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        const fetch = async () => {
            try {
                const [inadResp, pagsResp, fiadosResp] = await Promise.all([
                    clientesApi.list({ status: 'inadimplente', per_page: 1 }),
                    pagamentosApi.list({ estornado: false, per_page: 100 }),
                    fiadosApi.list({ per_page: 1000 }),
                ]);
                const cutoff24 = Date.now() - 24 * 60 * 60 * 1000;
                const cutoff30d = Date.now() - 30 * 24 * 60 * 60 * 1000;
                const inadCount = inadResp.total;
                const pagCount = pagsResp.data.filter(p => new Date(p.created_at).getTime() >= cutoff24).length;
                const vencCount = fiadosResp.data.filter(f => f.status !== 'pago' && new Date(f.created_at).getTime() <= cutoff30d).length;
                setCount(inadCount + pagCount + vencCount);
            } catch {
                setCount(0);
            }
        };
        fetch();
        const i = setInterval(fetch, 60_000);
        return () => clearInterval(i);
    }, []);

    return count;
};
