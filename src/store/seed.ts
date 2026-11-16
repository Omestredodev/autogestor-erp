import type { AppState, Customer, Product, Supplier, User, Vehicle } from "../domain/types";
import { DEFAULT_ROLE_PERMISSIONS } from "../domain/rules/permissions";
import { executeCommand, type Command } from "../domain/services";
import { referencePrice } from "../utils/calculations";
import { addDays, addMinutes, toInputDate } from "../utils/dates";

export const STATE_VERSION = 1;

const brands = [
  "Tecfil",
  "Cobreq",
  "NGK",
  "Cofap",
  "Gates",
  "Osram",
  "Bosch",
  "Mann-Filter",
  "Fram",
  "Mahle",
  "Nakata",
  "SKF",
];
const categories = [
  "Filtros",
  "Freios",
  "Ignição",
  "Suspensão",
  "Motor",
  "Elétrica",
  "Injeção",
  "Arrefecimento",
];

const brandId = (name: string) => `brd_${brands.indexOf(name) + 1}`;
const categoryId = (name: string) => `cat_${categories.indexOf(name) + 1}`;

type ProductSeed = [
  code: string,
  name: string,
  brand: string,
  category: string,
  mfr: string,
  ean: string,
  oem: string,
  cost: number,
  margin: number,
  stock: number,
  min: number,
  max: number,
  location: string,
];

const productSeeds: ProductSeed[] = [
  [
    "AG-00124",
    "Filtro de óleo PSL55",
    "Tecfil",
    "Filtros",
    "PSL55",
    "7896543210124",
    "030115561AN",
    18.5,
    0.42,
    24,
    8,
    50,
    "A-03-02",
  ],
  [
    "AG-00125",
    "Filtro de óleo W712/22",
    "Mann-Filter",
    "Filtros",
    "W712/22",
    "4011558720125",
    "030115561AN",
    21.9,
    0.4,
    14,
    6,
    30,
    "A-03-03",
  ],
  [
    "AG-00126",
    "Filtro de óleo PH5548",
    "Fram",
    "Filtros",
    "PH5548",
    "7891234560126",
    "",
    17.4,
    0.4,
    11,
    6,
    30,
    "A-03-04",
  ],
  [
    "AG-00286",
    "Pastilha de freio dianteira",
    "Cobreq",
    "Freios",
    "N-1837",
    "7894561230286",
    "5U0698151",
    74.9,
    0.38,
    4,
    10,
    30,
    "B-01-04",
  ],
  [
    "AG-00291",
    "Disco de freio ventilado",
    "Cobreq",
    "Freios",
    "CD-1240",
    "7894561230291",
    "6R0615301",
    138.0,
    0.36,
    8,
    4,
    16,
    "B-02-01",
  ],
  [
    "AG-00351",
    "Vela de ignição resistiva",
    "NGK",
    "Ignição",
    "BKR6E",
    "4975212230351",
    "101905601F",
    22.4,
    0.4,
    48,
    12,
    80,
    "C-02-01",
  ],
  [
    "AG-00407",
    "Amortecedor dianteiro",
    "Cofap",
    "Suspensão",
    "GP33218",
    "7891234500407",
    "5U0413031",
    189.5,
    0.35,
    2,
    4,
    16,
    "D-04-03",
  ],
  [
    "AG-00512",
    "Pivô de suspensão",
    "Nakata",
    "Suspensão",
    "N-9902",
    "7890000550512",
    "",
    46.8,
    0.4,
    12,
    5,
    24,
    "D-02-02",
  ],
  [
    "AG-00582",
    "Correia dentada 111 dentes",
    "Gates",
    "Motor",
    "CT1028",
    "7896543200582",
    "04C109119F",
    67.0,
    0.37,
    9,
    6,
    24,
    "A-07-02",
  ],
  [
    "AG-00590",
    "Kit rolamento de roda",
    "SKF",
    "Suspensão",
    "VKBA 3643",
    "7316571790590",
    "",
    118.0,
    0.38,
    7,
    4,
    16,
    "D-05-01",
  ],
  [
    "AG-00611",
    "Lâmpada H7 12V 55W",
    "Osram",
    "Elétrica",
    "64210",
    "4050300660611",
    "",
    29.9,
    0.45,
    31,
    10,
    60,
    "E-02-05",
  ],
  [
    "AG-00720",
    "Bomba d'água",
    "Mahle",
    "Arrefecimento",
    "CP 512",
    "4009026700720",
    "",
    152.0,
    0.35,
    2,
    3,
    12,
    "F-01-03",
  ],
  [
    "AG-00801",
    "Sensor de rotação",
    "Bosch",
    "Injeção",
    "0261210170",
    "4047024800801",
    "",
    84.5,
    0.4,
    6,
    4,
    20,
    "C-04-02",
  ],
  [
    "AG-00891",
    "Fluido de freio DOT 4 500ml",
    "Bosch",
    "Freios",
    "DOT4-500",
    "4047024800891",
    "",
    21.3,
    0.45,
    26,
    10,
    60,
    "B-04-01",
  ],
];

const vehicleSeeds: Omit<Vehicle, "id">[] = [
  {
    maker: "Volkswagen",
    model: "Gol",
    yearFrom: 2013,
    yearTo: 2018,
    engine: "1.6 MSI",
    version: "Trendline",
    features: "Flex · câmbio manual",
  },
  {
    maker: "Volkswagen",
    model: "Gol",
    yearFrom: 2013,
    yearTo: 2018,
    engine: "1.6 MSI",
    version: "Comfortline",
    features: "Flex · câmbio manual",
  },
  {
    maker: "Volkswagen",
    model: "Gol",
    yearFrom: 2017,
    yearTo: 2022,
    engine: "1.0 MPI",
    version: "Trendline",
    features: "Flex · 3 cilindros",
  },
  {
    maker: "Volkswagen",
    model: "Voyage",
    yearFrom: 2014,
    yearTo: 2018,
    engine: "1.6 MSI",
    version: "Comfortline",
    features: "Flex",
  },
  {
    maker: "Volkswagen",
    model: "Polo",
    yearFrom: 2018,
    yearTo: 2023,
    engine: "1.0 TSI",
    version: "Highline",
    features: "Turbo · câmbio automático",
  },
  {
    maker: "Fiat",
    model: "Argo",
    yearFrom: 2018,
    yearTo: 2023,
    engine: "1.3 Firefly",
    version: "Drive",
    features: "Flex",
  },
  {
    maker: "Fiat",
    model: "Strada",
    yearFrom: 2021,
    yearTo: 2024,
    engine: "1.3 Firefly",
    version: "Freedom",
    features: "Cabine dupla",
  },
  {
    maker: "Chevrolet",
    model: "Onix",
    yearFrom: 2020,
    yearTo: 2024,
    engine: "1.0 Turbo",
    version: "LT",
    features: "Turbo · flex",
  },
  {
    maker: "Chevrolet",
    model: "Onix",
    yearFrom: 2020,
    yearTo: 2024,
    engine: "1.0 Turbo",
    version: "Premier",
    features: "Turbo · câmbio automático",
  },
  {
    maker: "Toyota",
    model: "Corolla",
    yearFrom: 2020,
    yearTo: 2024,
    engine: "2.0 Dynamic Force",
    version: "XEi",
    features: "Câmbio CVT",
  },
  {
    maker: "Hyundai",
    model: "HB20",
    yearFrom: 2020,
    yearTo: 2024,
    engine: "1.0 TGDI",
    version: "Platinum",
    features: "Turbo",
  },
  {
    maker: "Hyundai",
    model: "HB20",
    yearFrom: 2020,
    yearTo: 2024,
    engine: "1.0 MPI",
    version: "Sense",
    features: "Aspirado",
  },
];

const applicationSeeds: [code: string, vehicle: number][] = [
  ["AG-00124", 1],
  ["AG-00124", 2],
  ["AG-00124", 4],
  ["AG-00125", 1],
  ["AG-00125", 2],
  ["AG-00126", 4],
  ["AG-00286", 1],
  ["AG-00286", 2],
  ["AG-00286", 4],
  ["AG-00291", 2],
  ["AG-00351", 1],
  ["AG-00351", 3],
  ["AG-00407", 1],
  ["AG-00407", 2],
  ["AG-00582", 1],
  ["AG-00582", 4],
  ["AG-00611", 5],
  ["AG-00611", 8],
  ["AG-00611", 11],
  ["AG-00512", 6],
  ["AG-00512", 7],
  ["AG-00590", 9],
  ["AG-00720", 10],
  ["AG-00801", 8],
  ["AG-00891", 6],
];

const userSeeds: Omit<User, "createdAt">[] = [
  {
    id: "usr_admin",
    name: "Mariana Costa",
    initials: "MC",
    email: "mariana@autopecasbrasil.com.br",
    roleId: "role_admin",
    active: true,
  },
  {
    id: "usr_rafael",
    name: "Rafael Lima",
    initials: "RL",
    email: "rafael@autopecasbrasil.com.br",
    roleId: "role_seller",
    active: true,
  },
  {
    id: "usr_carlos",
    name: "Carlos Mendes",
    initials: "CM",
    email: "carlos@autopecasbrasil.com.br",
    roleId: "role_seller",
    active: true,
  },
  {
    id: "usr_ana",
    name: "Ana Martins",
    initials: "AM",
    email: "ana@autopecasbrasil.com.br",
    roleId: "role_stock",
    active: true,
  },
  {
    id: "usr_camila",
    name: "Camila Freitas",
    initials: "CF",
    email: "camila@autopecasbrasil.com.br",
    roleId: "role_finance",
    active: true,
  },
];

function baseState(now: Date): AppState {
  const createdAt = addDays(now, -120).toISOString();
  const products: Product[] = productSeeds.map(
    ([code, name, brand, category, mfr, ean, oem, cost, margin, , min, max, location], index) => ({
      id: `prd_seed_${index + 1}`,
      code,
      name,
      brandId: brandId(brand),
      categoryId: categoryId(category),
      manufacturerCode: mfr,
      ean,
      oemCode: oem,
      unit: "UN",
      cost,
      margin,
      price: referencePrice(cost, margin),
      stock: 0,
      min,
      max,
      location,
      notes: "",
      active: true,
      createdAt,
      updatedAt: createdAt,
    }),
  );
  const customers: Customer[] = [
    {
      id: "cus_consumer",
      name: "AO CONSUMIDOR",
      document: "—",
      phone: "",
      email: "",
      address: "",
      type: "Genérico",
      paymentTerms: "À vista",
      creditLimit: 0,
      notes: "Identificação comercial genérica para vendas sem cadastro.",
      active: true,
      generic: true,
      createdAt,
    },
    {
      id: "cus_avenida",
      name: "Auto Center Avenida",
      document: "12.345.678/0001-90",
      phone: "(11) 3456-7820",
      email: "financeiro@autocenteravenida.com.br",
      address: "Av. Brasil, 1450 — São Paulo/SP",
      type: "Oficina",
      paymentTerms: "28 dias",
      creditLimit: 8000,
      notes: "",
      active: true,
      generic: false,
      createdAt,
    },
    {
      id: "cus_horizonte",
      name: "Transportadora Horizonte",
      document: "45.112.903/0001-08",
      phone: "(11) 3221-1040",
      email: "compras@horizontelog.com.br",
      address: "Rod. Anhanguera, km 22 — Osasco/SP",
      type: "Frota",
      paymentTerms: "Fechamento mensal",
      creditLimit: 20000,
      notes: "Frota de 32 veículos leves.",
      active: true,
      generic: false,
      createdAt,
    },
    {
      id: "cus_saolucas",
      name: "Oficina São Lucas",
      document: "29.087.771/0001-44",
      phone: "(11) 3762-0911",
      email: "contato@oficinasaolucas.com.br",
      address: "R. das Flores, 88 — São Paulo/SP",
      type: "Oficina",
      paymentTerms: "Fechamento quinzenal",
      creditLimit: 5000,
      notes: "",
      active: true,
      generic: false,
      createdAt,
    },
    {
      id: "cus_ricardo",
      name: "Ricardo Nogueira",
      document: "291.457.380-12",
      phone: "(11) 98842-5510",
      email: "ricardo.nogueira@email.com",
      address: "R. Itapeva, 300 — São Paulo/SP",
      type: "Pessoa física",
      paymentTerms: "À vista",
      creditLimit: 1500,
      notes: "",
      active: true,
      generic: false,
      createdAt,
    },
    {
      id: "cus_prado",
      name: "Mecânica Irmãos Prado",
      document: "33.784.120/0001-61",
      phone: "(11) 4002-8811",
      email: "prado@mecanicaprado.com.br",
      address: "Av. Interlagos, 2100 — São Paulo/SP",
      type: "Oficina",
      paymentTerms: "15 dias",
      creditLimit: 6000,
      notes: "",
      active: true,
      generic: false,
      createdAt,
    },
  ];
  const suppliers: Supplier[] = [
    {
      id: "sup_paulista",
      name: "Distribuidora Paulista de Peças",
      document: "08.441.220/0001-15",
      phone: "(11) 3301-4400",
      email: "vendas@distpaulista.com.br",
      city: "São Paulo/SP",
      contact: "Eduardo Lins",
      paymentTerms: "28 dias",
      active: true,
      createdAt,
    },
    {
      id: "sup_nacional",
      name: "AutoParts Nacional",
      document: "17.902.556/0001-30",
      phone: "(19) 3255-9010",
      email: "comercial@autopartsnacional.com.br",
      city: "Campinas/SP",
      contact: "Patrícia Rocha",
      paymentTerms: "21/28 dias",
      active: true,
      createdAt,
    },
    {
      id: "sup_sul",
      name: "Componentes Sul",
      document: "22.618.004/0001-77",
      phone: "(41) 3021-7744",
      email: "pedidos@componentessul.com.br",
      city: "Curitiba/PR",
      contact: "Marcos Weber",
      paymentTerms: "30 dias",
      active: true,
      createdAt,
    },
    {
      id: "sup_veloz",
      name: "Importadora Veloz",
      document: "40.115.382/0001-02",
      phone: "(13) 3219-5500",
      email: "contato@importadoraveloz.com.br",
      city: "Santos/SP",
      contact: "Lívia Prates",
      paymentTerms: "À vista",
      active: true,
      createdAt,
    },
  ];
  const vehicles = vehicleSeeds.map((vehicle, index) => ({ ...vehicle, id: `veh_${index + 1}` }));
  return {
    version: STATE_VERSION,
    brands: brands.map((name, index) => ({ id: `brd_${index + 1}`, name })),
    categories: categories.map((name, index) => ({ id: `cat_${index + 1}`, name })),
    products,
    vehicles,
    applications: applicationSeeds.map(([code, vehicle], index) => ({
      id: `app_seed_${index + 1}`,
      productId: products.find((product) => product.code === code)!.id,
      vehicleId: `veh_${vehicle}`,
      notes: "Exemplo demonstrativo — não verificado tecnicamente.",
      active: true,
      createdAt,
      createdBy: "usr_admin",
    })),
    equivalences: [],
    customers,
    suppliers,
    purchases: [],
    movements: [],
    sales: [],
    returns: [],
    payments: [],
    receivables: [],
    closings: [],
    reminders: [],
    users: userSeeds.map((user) => ({ ...user, createdAt })),
    roles: [
      {
        id: "role_admin",
        name: "Administrador",
        description: "Gerencia cadastros, usuários, permissões, estoque, vendas e auditoria.",
        permissions: DEFAULT_ROLE_PERMISSIONS.role_admin,
      },
      {
        id: "role_seller",
        name: "Vendedor",
        description: "Consulta catálogo, gerencia equivalências e realiza vendas e devoluções.",
        permissions: DEFAULT_ROLE_PERMISSIONS.role_seller,
      },
      {
        id: "role_stock",
        name: "Estoque/Compras",
        description: "Gerencia fornecedores, compras, aplicações e movimentações de estoque.",
        permissions: DEFAULT_ROLE_PERMISSIONS.role_stock,
      },
      {
        id: "role_finance",
        name: "Financeiro",
        description: "Gerencia contas a receber, pagamentos e fechamentos.",
        permissions: DEFAULT_ROLE_PERMISSIONS.role_finance,
      },
    ],
    audit: [],
    settings: {
      companyName: "Auto Peças Brasil Ltda.",
      tradeName: "Auto Peças Brasil",
      document: "12.345.678/0001-90",
      phone: "(11) 3456-7890",
      email: "contato@autopecasbrasil.com.br",
      city: "São Paulo/SP",
      allowBelowReference: true,
      lowStockAlerts: true,
      allowGenericCustomer: true,
    },
    session: { userId: "usr_admin" },
    seq: {
      saleNumber: 2830,
      purchaseNumber: 180,
      closingNumber: 190,
      paymentNumber: 1030,
      returnNumber: 40,
      receivableNumber: 500,
    },
  };
}

/**
 * Builds demo data by running the real business commands with relative dates,
 * so balances, movements, financial titles and audit trail are consistent.
 */
export function createSeedState(nowInput: Date = new Date()): AppState {
  const now = new Date(nowInput);
  let state = baseState(now);
  const id = (code: string) => state.products.find((product) => product.code === code)!.id;
  const at = (daysAgo: number, hour: number, minute = 0) => {
    const date = addDays(now, -daysAgo);
    date.setHours(hour, minute, 0, 0);
    if (date > now) return addMinutes(now, -5 * (daysAgo + 1)).toISOString();
    return date.toISOString();
  };
  const run = (command: Command, when: string, userId = "usr_admin") => {
    state = { ...state, session: { userId } };
    const result = executeCommand(state, command, when);
    if (!result.ok) throw new Error(`Seed: ${command.type} — ${result.error}`);
    state = result.state;
    return result.entityId!;
  };
  const lastSale = () => state.sales[state.sales.length - 1];

  // Opening balances recorded as initial movements.
  for (const [index, seed] of productSeeds.entries()) {
    const stock = seed[9];
    if (stock > 0) {
      const product = state.products[index];
      state = {
        ...state,
        products: state.products.map((item) =>
          item.id === product.id ? { ...item, stock } : item,
        ),
        movements: [
          ...state.movements,
          {
            id: `mov_seed_${index + 1}`,
            productId: product.id,
            type: "initial",
            quantity: stock,
            balanceBefore: 0,
            balanceAfter: stock,
            refType: "product",
            refId: product.id,
            reason: "Saldo de implantação",
            at: addDays(now, -60).toISOString(),
            userId: "usr_admin",
          },
        ],
      };
    }
  }

  run(
    {
      type: "equivalence.create",
      productAId: id("AG-00124"),
      productBId: id("AG-00125"),
      notes: "Mesma rosca e dimensões (exemplo).",
    },
    at(40, 10),
  );
  run(
    {
      type: "equivalence.create",
      productAId: id("AG-00124"),
      productBId: id("AG-00126"),
      notes: "Verificar vedação antes da troca.",
    },
    at(40, 10, 5),
  );

  run(
    {
      type: "purchase.save",
      input: {
        supplierId: "sup_paulista",
        documentNumber: "NF 184.221",
        date: toInputDate(at(26, 9)),
        notes: "Reposição mensal.",
        updateCost: false,
        items: [
          { productId: id("AG-00286"), quantity: 10, unitCost: 74.9 },
          { productId: id("AG-00351"), quantity: 20, unitCost: 22.4 },
        ],
      },
      confirm: true,
    },
    at(26, 9),
    "usr_ana",
  );
  run(
    {
      type: "purchase.save",
      input: {
        supplierId: "sup_nacional",
        documentNumber: "NF 077.410",
        date: toInputDate(at(12, 14)),
        notes: "",
        updateCost: true,
        items: [
          { productId: id("AG-00512"), quantity: 6, unitCost: 47.9 },
          { productId: id("AG-00611"), quantity: 12, unitCost: 29.9 },
        ],
      },
      confirm: true,
    },
    at(12, 14),
    "usr_ana",
  );

  const sale = (
    daysAgo: number,
    hour: number,
    sellerId: string,
    customerId: string,
    items: [string, number, number?][],
    mode: "immediate" | "deferred",
    method: "PIX" | "Dinheiro" | "Cartão de crédito" | "Cartão de débito" = "PIX",
    notes = "",
  ) => {
    const when = at(daysAgo, hour);
    return run(
      {
        type: "sale.create",
        input: {
          requestId: `seed-${state.seq.saleNumber + 1}`,
          customerId,
          sellerId,
          notes,
          paymentMode: mode,
          paymentMethod: mode === "immediate" ? method : undefined,
          dueDate: mode === "deferred" ? toInputDate(addDays(when, 28)) : undefined,
          items: items.map(([code, quantity, price]) => ({
            productId: id(code),
            quantity,
            price: price ?? state.products.find((p) => p.code === code)!.price,
          })),
        },
      },
      when,
      sellerId,
    );
  };

  const saoLucasA = sale(
    27,
    10,
    "usr_carlos",
    "cus_saolucas",
    [
      ["AG-00286", 2],
      ["AG-00891", 2],
    ],
    "deferred",
  );
  const saoLucasB = sale(
    22,
    15,
    "usr_carlos",
    "cus_saolucas",
    [
      ["AG-00582", 1],
      ["AG-00351", 4],
    ],
    "deferred",
  );
  run(
    {
      type: "closing.create",
      customerId: "cus_saolucas",
      saleIds: [saoLucasA, saoLucasB],
      dueDate: toInputDate(addDays(now, 3)),
      notes: "Fechamento quinzenal.",
    },
    at(20, 17),
    "usr_camila",
  );
  const saoLucasClosing = state.closings[state.closings.length - 1].id;
  run(
    {
      type: "payment.register",
      target: { closingId: saoLucasClosing },
      amount: 200,
      method: "PIX",
      notes: "Pagamento parcial",
    },
    at(10, 11),
    "usr_camila",
  );

  sale(18, 9, "usr_rafael", "cus_consumer", [["AG-00611", 2]], "immediate", "Dinheiro");
  sale(
    16,
    16,
    "usr_admin",
    "cus_avenida",
    [
      ["AG-00291", 2],
      ["AG-00286", 2],
    ],
    "immediate",
    "Cartão de crédito",
  );
  sale(
    14,
    11,
    "usr_rafael",
    "cus_ricardo",
    [["AG-00351", 4]],
    "immediate",
    "PIX",
    "Cliente pediu nota com CPF.",
  );
  sale(
    12,
    10,
    "usr_carlos",
    "cus_horizonte",
    [
      ["AG-00512", 2],
      ["AG-00590", 1],
    ],
    "deferred",
    "PIX",
    "Veículo placa ABC-1D23",
  );
  sale(
    9,
    14,
    "usr_rafael",
    "cus_prado",
    [
      ["AG-00720", 1],
      ["AG-00891", 2],
    ],
    "immediate",
    "Cartão de débito",
  );
  const returned = sale(
    7,
    10,
    "usr_carlos",
    "cus_avenida",
    [
      ["AG-00286", 2, 115],
      ["AG-00891", 2],
    ],
    "immediate",
    "PIX",
    "Desconto negociado na pastilha.",
  );
  run(
    {
      type: "sale.return",
      saleId: returned,
      reason: "Peça incompatível com o veículo do cliente.",
      items: [{ saleItemId: state.sales.find((s) => s.id === returned)!.items[0].id, quantity: 1 }],
    },
    at(6, 15),
    "usr_carlos",
  );
  run(
    {
      type: "payment.refund",
      target: { saleId: returned },
      amount: 115,
      method: "PIX",
      notes: "Reembolso da devolução",
    },
    at(6, 16),
    "usr_camila",
  );
  sale(
    6,
    15,
    "usr_carlos",
    "cus_horizonte",
    [
      ["AG-00801", 1],
      ["AG-00611", 4],
    ],
    "deferred",
  );
  run(
    {
      type: "stock.adjust",
      productId: id("AG-00590"),
      newQuantity: state.products.find((p) => p.code === "AG-00590")!.stock - 1,
      reason: "Avaria identificada na conferência.",
    },
    at(5, 17),
    "usr_ana",
  );
  const cancelled = sale(
    4,
    11,
    "usr_rafael",
    "cus_ricardo",
    [
      ["AG-00611", 1],
      ["AG-00891", 1],
    ],
    "immediate",
    "Dinheiro",
  );
  run(
    { type: "sale.cancel", saleId: cancelled, reason: "Venda registrada em duplicidade." },
    at(4, 11, 20),
  );
  run(
    {
      type: "payment.refund",
      target: { saleId: cancelled },
      amount: state.payments.find((p) => p.saleId === cancelled)!.amount,
      method: "Dinheiro",
      notes: "Estorno do cancelamento",
    },
    at(4, 11, 30),
    "usr_camila",
  );
  sale(
    3,
    9,
    "usr_admin",
    "cus_prado",
    [
      ["AG-00512", 2],
      ["AG-00351", 4],
    ],
    "deferred",
  );
  sale(
    2,
    16,
    "usr_rafael",
    "cus_consumer",
    [
      ["AG-00611", 2],
      ["AG-00351", 4],
    ],
    "immediate",
    "PIX",
  );
  sale(
    1,
    10,
    "usr_carlos",
    "cus_avenida",
    [
      ["AG-00590", 1],
      ["AG-00286", 2],
    ],
    "immediate",
    "Cartão de crédito",
  );
  sale(
    0,
    8,
    "usr_rafael",
    "cus_consumer",
    [
      ["AG-00891", 2],
      ["AG-00611", 1],
    ],
    "immediate",
    "Dinheiro",
  );
  sale(
    0,
    9,
    "usr_admin",
    "cus_horizonte",
    [
      ["AG-00286", 2],
      ["AG-00291", 1],
    ],
    "deferred",
    "PIX",
    "Revisão preventiva da frota.",
  );
  sale(0, 10, "usr_carlos", "cus_avenida", [["AG-00720", 1]], "immediate", "PIX");

  run(
    {
      type: "purchase.save",
      input: {
        supplierId: "sup_sul",
        documentNumber: "PED-00918",
        date: toInputDate(now),
        notes: "Aguardando chegada da mercadoria.",
        updateCost: false,
        items: [
          { productId: id("AG-00407"), quantity: 6, unitCost: 192 },
          { productId: id("AG-00286"), quantity: 10, unitCost: 76.5 },
        ],
      },
      confirm: false,
    },
    at(0, 7),
    "usr_ana",
  );

  const reminder = (
    title: string,
    description: string,
    due: Date,
    ownerId: string,
    links: { customerId?: string; productId?: string; saleId?: string } = {},
  ) =>
    run(
      {
        type: "reminder.save",
        input: { title, description, dueAt: due.toISOString(), ownerId, sharing: "team", ...links },
      },
      addMinutes(now, -240).toISOString(),
    );
  reminder(
    "Retornar orçamento ao cliente",
    "Confirmar condições do orçamento de pastilhas e discos.",
    addMinutes(now, -2),
    "usr_admin",
    { customerId: "cus_avenida" },
  );
  reminder(
    "Revisar estoque de amortecedores",
    "Amortecedor dianteiro abaixo do mínimo; acompanhar pedido PED-00918.",
    addMinutes(now, 90),
    "usr_ana",
    { productId: id("AG-00407") },
  );
  reminder(
    "Cobrar fechamento quinzenal",
    "Fechamento da Oficina São Lucas vence em breve.",
    addDays(now, 1),
    "usr_camila",
    { customerId: "cus_saolucas" },
  );
  const doneId = reminder(
    "Confirmar entrega da frota",
    "Entrega das peças da revisão preventiva.",
    addDays(now, -2),
    "usr_carlos",
    { saleId: lastSale().id },
  );
  run(
    { type: "reminder.setStatus", id: doneId, status: "done" },
    addMinutes(now, -200).toISOString(),
  );

  return { ...state, session: { userId: "usr_admin" } };
}
