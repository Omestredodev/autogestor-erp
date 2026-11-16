import { useState } from "react";
import { Database, RotateCcw, Save } from "lucide-react";
import { Button, Card, Field, Notice, Toggle } from "../../components/ui";
import { PageHeader } from "../../components/layout/PageHeader";
import { useCommand } from "../../components/shared/useCommand";
import { useDeny } from "../../components/shared/permissions";
import { useNavigation } from "../../app/navigation/NavigationProvider";
import { useStore } from "../../store/AppProvider";
import { STORAGE_KEY } from "../../store/persistence";
import { STATE_VERSION } from "../../store/seed";

export function SettingsPage() {
  const { state, storageAvailable } = useStore();
  const { open } = useNavigation();
  const { execute, busy } = useCommand();
  const deny = useDeny();
  const [settings, setSettings] = useState(state.settings);
  const denied = deny("settings.manage");
  const set = (key: keyof typeof settings) => (event: { target: { value: string } }) =>
    setSettings({ ...settings, [key]: event.target.value });
  const size = new Blob([JSON.stringify(state)]).size;
  return (
    <>
      <PageHeader
        title="Configurações"
        subtitle="Preferências gerais da empresa e do sistema"
        actions={
          <Button
            icon={Save}
            loading={busy}
            disabledReason={denied}
            onClick={() => execute({ type: "settings.save", settings })}
          >
            Salvar configurações
          </Button>
        }
      />
      <div className="settings-grid">
        <Card title="Dados da empresa" subtitle="Exibidos no comprovante interno">
          <fieldset className="form-grid" disabled={Boolean(denied)}>
            <Field label="Razão social">
              <input value={settings.companyName} onChange={set("companyName")} />
            </Field>
            <Field label="Nome fantasia">
              <input value={settings.tradeName} onChange={set("tradeName")} />
            </Field>
            <Field label="CNPJ">
              <input value={settings.document} onChange={set("document")} />
            </Field>
            <Field label="Telefone">
              <input value={settings.phone} onChange={set("phone")} />
            </Field>
            <Field label="E-mail">
              <input value={settings.email} onChange={set("email")} />
            </Field>
            <Field label="Cidade/UF">
              <input value={settings.city} onChange={set("city")} />
            </Field>
          </fieldset>
        </Card>
        <Card title="Preferências comerciais" subtitle="Aplicadas às regras de venda">
          <div className="settings-list">
            <Toggle
              disabled={Boolean(denied)}
              checked={settings.allowBelowReference}
              onChange={(value) => setSettings({ ...settings, allowBelowReference: value })}
              label="Permitir preço abaixo da referência"
              description="Somente para perfis com permissão de alterar preço"
            />
            <Toggle
              disabled={Boolean(denied)}
              checked={settings.lowStockAlerts}
              onChange={(value) => setSettings({ ...settings, lowStockAlerts: value })}
              label="Alertas de estoque mínimo"
              description="Exibir avisos nas notificações"
            />
            <Toggle
              disabled={Boolean(denied)}
              checked={settings.allowGenericCustomer}
              onChange={(value) => setSettings({ ...settings, allowGenericCustomer: value })}
              label="Venda AO CONSUMIDOR"
              description="Permitir vendas sem identificação do cliente (sempre com pagamento imediato)"
            />
          </div>
        </Card>
        <Card
          title="Dados de demonstração"
          subtitle="Ambiente demonstrativo, sem backend"
          className="settings-demo"
        >
          <div className="card-pad form-stack">
            <Notice
              title="Armazenamento local do navegador"
              tone={storageAvailable ? "info" : "danger"}
            >
              {storageAvailable
                ? `Os registros são salvos automaticamente no localStorage (chave "${STORAGE_KEY}", formato v${STATE_VERSION}, ~${Math.round(size / 1024)} KB). Esta não é uma solução de produção; a versão final usará backend e PostgreSQL.`
                : "Não foi possível gravar no localStorage. As alterações serão perdidas ao recarregar."}
            </Notice>
            <div className="demo-stats">
              <span>
                <Database size={15} /> {state.products.length} produtos · {state.sales.length}{" "}
                vendas · {state.movements.length} movimentações · {state.audit.length} eventos de
                auditoria
              </span>
              <Button
                variant="danger"
                icon={RotateCcw}
                onClick={() => open({ type: "reset-demo" })}
              >
                Restaurar dados de demonstração
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
