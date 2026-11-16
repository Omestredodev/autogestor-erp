import { Printer } from "lucide-react";
import { Button, Dialog } from "../../components/ui";
import { useStore } from "../../store/AppProvider";
import { byId } from "../../store/selectors";
import { ReceiptView } from "./ReceiptView";

export function ReceiptDialog({ saleId, close }: { saleId: string; close: () => void }) {
  const { state } = useStore();
  const sale = byId(state.sales, saleId);
  if (!sale) return null;
  return (
    <Dialog
      title={`Comprovante interno ${sale.number}`}
      subtitle="Reemissão com valores originais, devolvidos e líquidos"
      close={close}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Fechar
          </Button>
          <Button icon={Printer} onClick={() => window.print()}>
            Imprimir
          </Button>
        </>
      }
    >
      <ReceiptView sale={sale} />
    </Dialog>
  );
}
