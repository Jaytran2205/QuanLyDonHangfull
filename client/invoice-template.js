import { formatCurrency } from "/assets/app.js";

const COMPANY_INFO = {
  name: "CÔNG TY TNHH ABC",
  address: "Địa chỉ: 123 Đường Nội Bộ, TP.HCM",
  phone: "SĐT: 0909 000 000"
};

function toNumber(value) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return 0;
  return parsed;
}

function renderItemsRowsEditable(items = []) {
  return items
    .map((item, index) => {
      const quantity = Math.max(0, toNumber(item.quantity));
      const price = Math.max(0, toNumber(item.price));
      const total = quantity * price;

      return `
        <tr data-row-index="${index}">
          <td>${index + 1}</td>
          <td>
            <input
              class="invoice-input invoice-item-name"
              type="text"
              data-field="name"
              value="${item.productName || ""}"
            />
          </td>
          <td>
            <input
              class="invoice-input invoice-item-number"
              type="number"
              min="0"
              step="1"
              data-field="quantity"
              value="${quantity}"
            />
          </td>
          <td>
            <input
              class="invoice-input invoice-item-number"
              type="number"
              min="0"
              step="1000"
              data-field="price"
              value="${price}"
            />
          </td>
          <td class="invoice-line-total" data-line-total="${total}">${formatCurrency(total)}</td>
        </tr>
      `;
    })
    .join("");
}

function recalculateInvoiceTotal(modalRoot) {
  const rows = modalRoot.querySelectorAll("tbody tr[data-row-index]");
  let grandTotal = 0;

  rows.forEach((row) => {
    const quantityInput = row.querySelector('input[data-field="quantity"]');
    const priceInput = row.querySelector('input[data-field="price"]');
    const lineTotalCell = row.querySelector(".invoice-line-total");

    const quantity = Math.max(0, toNumber(quantityInput?.value));
    const price = Math.max(0, toNumber(priceInput?.value));
    const lineTotal = quantity * price;

    if (lineTotalCell) {
      lineTotalCell.dataset.lineTotal = String(lineTotal);
      lineTotalCell.textContent = formatCurrency(lineTotal);
    }

    grandTotal += lineTotal;
  });

  const grandTotalElement = modalRoot.querySelector("#invoiceGrandTotal");
  if (grandTotalElement) {
    grandTotalElement.textContent = formatCurrency(grandTotal);
  }
}

export function showInvoicePrintModal(order) {
  const existing = document.getElementById("invoicePrintModal");
  if (existing) {
    existing.remove();
  }

  const exportDate = order?.exportDate ? new Date(order.exportDate) : new Date();
  const customerName = order?.customer?.name || "-";
  const customerPhone = order?.customer?.phone || "-";
  const itemsHtml = renderItemsRowsEditable(order?.items || []);

  const modal = document.createElement("div");
  modal.id = "invoicePrintModal";
  modal.className = "invoice-print-modal";
  modal.innerHTML = `
    <div class="invoice-print-shell">
      <div class="invoice-actions">
        <button class="btn-primary" id="invoicePrintBtn">In hóa đơn</button>
        <button class="btn-muted" id="invoiceSkipBtn">Bỏ qua</button>
        <button class="btn-muted" id="invoiceCloseBtn">Quay lại</button>
      </div>

      <div class="invoice-a4">
        <h1>HÓA ĐƠN XUẤT HÀNG</h1>

        <div class="invoice-company">
          <strong>Công ty:</strong> <input class="invoice-input" type="text" value="${COMPANY_INFO.name}" /><br>
          <strong>Địa chỉ:</strong> <input class="invoice-input invoice-input-wide" type="text" value="123 Đường Nội Bộ, TP.HCM" /><br>
          <strong>SĐT:</strong> <input class="invoice-input" type="text" value="0909 000 000" /><br>
          <strong>Ngày xuất:</strong> <input class="invoice-input" type="text" value="${exportDate.toLocaleString("vi-VN")}" />
        </div>

        <hr>

        <div class="invoice-customer">
          <strong>Khách hàng:</strong> <input class="invoice-input" type="text" value="${customerName}" /><br>
          <strong>SĐT:</strong> <input class="invoice-input" type="text" value="${customerPhone}" />
        </div>

        <table>
          <thead>
            <tr>
              <th>STT</th>
              <th>Tên SP</th>
              <th>Số lượng</th>
              <th>Đơn giá</th>
              <th>Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <h2>Tổng tiền: <span id="invoiceGrandTotal">${formatCurrency(order?.grandTotal || 0)}</span></h2>

        <div class="sign">
          <div>Người giao</div>
          <div>Người nhận</div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector("tbody")?.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    recalculateInvoiceTotal(modal);
  });

  recalculateInvoiceTotal(modal);

  document.getElementById("invoicePrintBtn")?.addEventListener("click", () => {
    recalculateInvoiceTotal(modal);
    window.print();
  });

  document.getElementById("invoiceSkipBtn")?.addEventListener("click", () => {
    modal.remove();
  });

  document.getElementById("invoiceCloseBtn")?.addEventListener("click", () => {
    modal.remove();
  });
}
