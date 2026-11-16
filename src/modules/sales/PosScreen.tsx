import { useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  ExternalLink,
  Minus,
  Package,
  Plus,
  Printer,
  Search,
  ShieldCheck,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import { Button, ErrorBanner, Field } from "../../components/ui";
import { useCommand } from "../../components/shared/useCommand";
import { useToast } from "../../components/shared/Toast";
import { useNavigation } from "../../app/navigation/NavigationProvider";
import { useStore } from "../../store/AppProvider";
import { createRequestId } from "../../store/actions";
import { brandName, byId } from "../../store/selectors";
import { customerOpenBalance } from "../../domain/rules/finance";
import type { PaymentMethod } from "../../domain/types";
import { matchesText } from "../../utils/calculations";
import { formatDecimalInput, money, parseDecimal, round2 } from "../../utils/currency";
import { addDays, toInputDate } from "../../utils/dates";
import { ReceiptView } from "./ReceiptView";

interface CartLine {
  productId: string;
  quantity: number;
  priceInput: string;
}

const METHODS: PaymentMethod[] = [
  "PIX",
  "Dinheiro",
  "Cartão de débito",
  "Cartão de crédito",
  "Transferência",
  "Boleto",
];

export function PosScreen({ customerId, close }: { customerId?: string; close: () => void }) {
  const { state, user, can } = useStore();
  const { navigate } = useNavigation();
  const { notify } = useToast();
  const { execute, busy, error, setError } = useCommand();
  const searchRef = useRef<HTMLInputElement>(null);
  const genericId = state.customers.find((customer) => customer.generic)?.id ?? "";
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customer, setCustomer] = useState(customerId ?? genericId);
  const [seller, setSeller] = useState(user.id);
  const [notes, setNotes] = useState("");
  const [mode, setMode] = useState<"immediate" | "deferred">("immediate");
  const [method, setMethod] = useState<PaymentMethod>("PIX");
  const [dueDate, setDueDate] = useState(toInputDate(addDays(new Date(), 28)));
  const [requestId, setRequestId] = useState(createRequestId);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const canOverride = can("sales.priceOverride");

  const results = useMemo(
    () =>
      state.products
        .filter((product) => product.active)
        .filter((product) =>
          matchesText(
            query,
            product.code,
            product.manufacturerCode,
            product.ean,
            product.oemCode,
            product.name,
            brandName(state, product.brandId),
          ),
        )
        .slice(0, query ? 20 : 12),
    [state, query],
  );
  const sellers = state.users.filter(
    (item) =>
      item.active &&
      state.roles.find((role) => role.id === item.roleId)?.permissions.includes("sales.create"),
  );
  const selectedCustomer = byId(state.customers, customer);

  const lines = cart.map((line) => {
    const product = byId(state.products, line.productId)!;
    const price = round2(parseDecimal(line.priceInput));
    const problems: string[] = [];
    if (!product.active) problems.push("Produto inativo");
    if (line.quantity > product.stock) problems.push(`Disponível: ${product.stock}`);
    if (!Number.isFinite(price) || price <= 0) problems.push("Preço inválido");
    return {
      ...line,
      product,
      price,
      subtotal: Number.isFinite(price) ? round2(price * line.quantity) : 0,
      reference: round2(product.price * line.quantity),
      problems,
    };
  });
  const total = round2(lines.reduce((sum, line) => sum + line.subtotal, 0));
  const referenceTotal = round2(lines.reduce((sum, line) => sum + line.reference, 0));
  const adjustment = round2(total - referenceTotal);
  const blocking =
    lines.length === 0
      ? "Adicione itens à venda"
      : lines.some((line) => line.problems.length)
        ? "Corrija os itens destacados"
        : !selectedCustomer
          ? "Selecione o cliente"
          : mode === "deferred" && selectedCustomer.generic
            ? "Pagamento posterior exige cliente cadastrado"
            : mode === "deferred" && !dueDate
              ? "Informe o vencimento"
              : undefined;

  const add = (productId: string) => {
    const product = byId(state.products, productId)!;
    const existing = cart.find((line) => line.productId === productId);
    const quantity = (existing?.quantity ?? 0) + 1;
    if (quantity > product.stock) {
      notify(`Estoque insuficiente para ${product.code}: disponível ${product.stock} un.`, "error");
      return;
    }
    setCart(
      existing
        ? cart.map((line) => (line.productId === productId ? { ...line, quantity } : line))
        : [...cart, { productId, quantity: 1, priceInput: formatDecimalInput(product.price) }],
    );
    setError(null);
  };
  const setQuantity = (productId: string, quantity: number) =>
    setCart(
      cart.map((line) =>
        line.productId === productId
          ? { ...line, quantity: Math.max(1, Math.floor(quantity) || 1) }
          : line,
      ),
    );

  const finish = () => {
    if (blocking) return;
    execute(
      {
        type: "sale.create",
        input: {
          requestId,
          customerId: customer,
          sellerId: seller,
          notes,
          paymentMode: mode,
          paymentMethod: mode === "immediate" ? method : undefined,
          dueDate: mode === "deferred" ? dueDate : undefined,
          items: lines.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
            price: line.price,
          })),
        },
      },
      { silent: true, onSuccess: (id) => id && setReceiptId(id) },
    );
  };

  const reset = () => {
    setCart([]);
    setNotes("");
    setQuery("");
    setMode("immediate");
    setCustomer(genericId);
    setRequestId(createRequestId());
    setReceiptId(null);
    window.setTimeout(() => searchRef.current?.focus(), 50);
  };

  const receiptSale = byId(state.sales, receiptId ?? undefined);
  if (receiptSale) {
    return (
      <div className="overlay">
        <section className="dialog" role="dialog" aria-modal="true" aria-label="Venda concluída">
          <header>
            <div>
              <h2>Venda {receiptSale.number} registrada</h2>
              <p>Estoque baixado, histórico e financeiro atualizados</p>
            </div>
            <button type="button" onClick={close} aria-label="Fechar">
              <X size={21} />
            </button>
          </header>
          <div className="dialog-body">
            <div className="success-circle">
              <Check size={26} />
            </div>
            <ReceiptView sale={receiptSale} />
          </div>
          <footer className="dialog-footer-bar">
            <Button variant="secondary" icon={Printer} onClick={() => window.print()}>
              Imprimir
            </Button>
            <Button
              variant="secondary"
              icon={ExternalLink}
              onClick={() => {
                close();
                navigate({ page: "sales", id: receiptSale.id });
              }}
            >
              Abrir venda
            </Button>
            <Button icon={Plus} onClick={reset}>
              Nova venda
            </Button>
          </footer>
        </section>
      </div>
    );
  }

  return (
    <div className="overlay">
      <div className="pos-modal" role="dialog" aria-modal="true" aria-label="Nova venda">
        <header>
          <div>
            <span>
              <ShoppingCart size={22} />
            </span>
            <div>
              <h2>Nova venda</h2>
              <p>Atendimento por {user.name}</p>
            </div>
          </div>
          <button type="button" onClick={close} aria-label="Fechar frente de caixa">
            <X size={21} />
          </button>
        </header>
        <div className="pos-body">
          <section className="pos-products">
            <label className="search-field">
              <Search size={18} />
              <input
                ref={searchRef}
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && results[0]) {
                    add(results[0].id);
                    setQuery("");
                  }
                }}
                placeholder="Código, fabricante, EAN ou descrição..."
                aria-label="Pesquisar produto"
              />
            </label>
            <h4>
              {query ? `${results.length} resultado(s)` : "Produtos ativos"} · Enter adiciona o
              primeiro
            </h4>
            {results.length === 0 && <p className="muted-text">Nenhum produto ativo encontrado.</p>}
            {results.map((product) => {
              const inCart = cart.find((line) => line.productId === product.id)?.quantity ?? 0;
              const available = product.stock - inCart;
              return (
                <button
                  type="button"
                  key={product.id}
                  onClick={() => add(product.id)}
                  disabled={available <= 0}
                  title={available <= 0 ? "Sem saldo disponível" : "Adicionar à venda"}
                >
                  <div className="mini-product">
                    <Package size={20} />
                  </div>
                  <div>
                    <small>
                      {product.code} · {brandName(state, product.brandId)}
                    </small>
                    <strong>{product.name}</strong>
                    <span className={available <= 0 ? "qty-negative" : ""}>
                      {product.stock} un. em estoque{inCart ? ` · ${inCart} no carrinho` : ""}
                    </span>
                  </div>
                  <b>{money(product.price)}</b>
                  <Plus size={18} />
                </button>
              );
            })}
          </section>
          <section className="pos-cart">
            <div className="pos-section-title">
              <div>
                <h3>Itens da venda</h3>
                <span>
                  {lines.length} produto(s) · {lines.reduce((sum, line) => sum + line.quantity, 0)}{" "}
                  unidade(s)
                </span>
              </div>
              {cart.length > 0 && (
                <button type="button" onClick={() => setCart([])}>
                  <Trash2 size={16} /> Limpar
                </button>
              )}
            </div>
            {lines.length === 0 ? (
              <div className="empty-state">
                <div>
                  <ShoppingCart size={27} />
                </div>
                <h3>Carrinho vazio</h3>
                <p>Pesquise e selecione produtos à esquerda para iniciar a venda.</p>
              </div>
            ) : (
              <>
                <div className="cart-head">
                  <span>Produto</span>
                  <span>Qtd.</span>
                  <span>Preço unit.</span>
                  <span>Subtotal</span>
                  <span />
                </div>
                {lines.map((line) => (
                  <div
                    className={`cart-line ${line.problems.length ? "invalid-line" : ""}`}
                    key={line.productId}
                  >
                    <div>
                      <small>
                        {line.product.code} · ref. {money(line.product.price)}
                      </small>
                      <strong>{line.product.name}</strong>
                      {line.problems.length > 0 && (
                        <em className="field-error">
                          <AlertCircle size={12} /> {line.problems.join(" · ")}
                        </em>
                      )}
                    </div>
                    <div className="qty">
                      <button
                        type="button"
                        onClick={() => setQuantity(line.productId, line.quantity - 1)}
                        aria-label="Diminuir quantidade"
                      >
                        <Minus size={14} />
                      </button>
                      <input
                        value={line.quantity}
                        onChange={(event) =>
                          setQuantity(line.productId, Number(event.target.value))
                        }
                        inputMode="numeric"
                        aria-label="Quantidade"
                      />
                      <button
                        type="button"
                        onClick={() => setQuantity(line.productId, line.quantity + 1)}
                        aria-label="Aumentar quantidade"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <label
                      className={
                        line.price !== line.product.price && Number.isFinite(line.price)
                          ? "price-changed"
                          : ""
                      }
                      title={
                        canOverride
                          ? "Preço praticado nesta venda (não altera o cadastro)"
                          : "Seu perfil não pode alterar o preço praticado"
                      }
                    >
                      R$
                      <input
                        value={line.priceInput}
                        readOnly={!canOverride}
                        onChange={(event) =>
                          setCart(
                            cart.map((item) =>
                              item.productId === line.productId
                                ? { ...item, priceInput: event.target.value }
                                : item,
                            ),
                          )
                        }
                        aria-label="Preço unitário praticado"
                      />
                    </label>
                    <strong>{money(line.subtotal)}</strong>
                    <button
                      type="button"
                      onClick={() =>
                        setCart(cart.filter((item) => item.productId !== line.productId))
                      }
                      aria-label="Remover item"
                    >
                      <X size={17} />
                    </button>
                  </div>
                ))}
              </>
            )}
          </section>
          <aside className="pos-summary">
            <Field label="Cliente">
              <select value={customer} onChange={(event) => setCustomer(event.target.value)}>
                {state.customers
                  .filter((item) => item.active)
                  .sort(
                    (a, b) => Number(b.generic) - Number(a.generic) || a.name.localeCompare(b.name),
                  )
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.generic ? "AO CONSUMIDOR" : item.name}
                    </option>
                  ))}
              </select>
            </Field>
            {selectedCustomer && !selectedCustomer.generic && (
              <small className="field-hint">
                {selectedCustomer.paymentTerms} · em aberto{" "}
                {money(customerOpenBalance(state, selectedCustomer.id))}
                {selectedCustomer.creditLimit > 0
                  ? ` · limite ${money(selectedCustomer.creditLimit)}`
                  : ""}
              </small>
            )}
            <Field label="Vendedor">
              <select value={seller} onChange={(event) => setSeller(event.target.value)}>
                {sellers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Observações desta venda">
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Ex.: placa do veículo, condição negociada..."
              />
            </Field>
            <div className="sale-totals">
              <div>
                <span>Total pelo preço de referência</span>
                <strong>{money(referenceTotal)}</strong>
              </div>
              <div>
                <span>
                  {adjustment < 0
                    ? "Desconto praticado"
                    : adjustment > 0
                      ? "Acréscimo praticado"
                      : "Ajuste de preços"}
                </span>
                <strong
                  className={adjustment < 0 ? "qty-negative" : adjustment > 0 ? "qty-positive" : ""}
                >
                  {money(adjustment)}
                </strong>
              </div>
              <hr />
              <div className="grand-total">
                <span>Total</span>
                <strong>{money(total)}</strong>
              </div>
            </div>
            <Field label="Condição de pagamento">
              <select
                value={mode}
                onChange={(event) => setMode(event.target.value as "immediate" | "deferred")}
              >
                <option value="immediate">Pagamento imediato</option>
                <option value="deferred">Em aberto — pagamento posterior</option>
              </select>
            </Field>
            {mode === "immediate" ? (
              <Field label="Forma de pagamento">
                <select
                  value={method}
                  onChange={(event) => setMethod(event.target.value as PaymentMethod)}
                >
                  {METHODS.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </Field>
            ) : (
              <Field
                label="Vencimento"
                error={
                  selectedCustomer?.generic
                    ? "AO CONSUMIDOR não pode gerar conta a receber."
                    : undefined
                }
              >
                <input
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                />
              </Field>
            )}
            <ErrorBanner error={error} />
            <button
              type="button"
              className="finish-sale"
              disabled={Boolean(blocking) || busy}
              onClick={finish}
              title={blocking}
            >
              <Check size={19} /> {busy ? "Registrando..." : "Finalizar venda"}
            </button>
            <small className="secure-note">
              <ShieldCheck size={14} />{" "}
              {blocking ?? "A baixa do estoque será registrada automaticamente"}
            </small>
          </aside>
        </div>
      </div>
    </div>
  );
}
