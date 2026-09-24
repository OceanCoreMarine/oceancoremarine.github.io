
/* OceanCore: Quotation + Invoice Edit/Delete controls
   This enhancement adds safe edit/delete controls to existing list rows.
   It uses the current Supabase client exposed by the app as window.supabaseClient
   (or window.supabase) and the existing quotation/invoice item tables.
*/
(function () {
  'use strict';

  const getClient = () => window.supabaseClient || window.supabase;
  const adminConfirm = (msg) => window.confirm(msg);

  async function deleteWithItems(table, itemTable, id, idField) {
    const sb = getClient();
    if (!sb) throw new Error('Supabase client not available');

    const { error: itemErr } = await sb.from(itemTable).delete().eq(idField, id);
    if (itemErr) throw itemErr;

    const { error } = await sb.from(table).delete().eq('id', id);
    if (error) throw error;
  }

  async function deleteQuotation(id) {
    if (!adminConfirm('Are you sure you want to delete this quotation? This cannot be undone.')) return;
    try {
      await deleteWithItems('quotations', 'quotation_items', id, 'quotation_id');
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert('Could not delete quotation: ' + (e.message || e));
    }
  }

  async function deleteInvoice(id) {
    if (!adminConfirm('Are you sure you want to delete this invoice? This cannot be undone.')) return;
    try {
      await deleteWithItems('invoices', 'invoice_items', id, 'invoice_id');
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert('Could not delete invoice: ' + (e.message || e));
    }
  }

  function findId(el) {
    return el.dataset.id || el.dataset.quotationId || el.dataset.invoiceId ||
      el.closest('[data-id]')?.dataset.id ||
      el.closest('[data-quotation-id]')?.dataset.quotationId ||
      el.closest('[data-invoice-id]')?.dataset.invoiceId;
  }

  function addControls() {
    document.querySelectorAll('[data-quotation-row], .quotation-row, [data-quotation-id]').forEach(row => {
      const id = findId(row);
      if (!id || row.querySelector('.oc-edit-delete')) return;
      const box = document.createElement('span');
      box.className = 'oc-edit-delete';
      box.style.cssText = 'display:inline-flex;gap:6px;margin-left:8px;';
      box.innerHTML = `
        <button type="button" class="oc-edit-quotation" data-id="${id}">Edit</button>
        <button type="button" class="oc-delete-quotation" data-id="${id}">Delete</button>`;
      row.appendChild(box);
    });

    document.querySelectorAll('[data-invoice-row], .invoice-row, [data-invoice-id]').forEach(row => {
      const id = findId(row);
      if (!id || row.querySelector('.oc-edit-delete')) return;
      const box = document.createElement('span');
      box.className = 'oc-edit-delete';
      box.style.cssText = 'display:inline-flex;gap:6px;margin-left:8px;';
      box.innerHTML = `
        <button type="button" class="oc-edit-invoice" data-id="${id}">Edit</button>
        <button type="button" class="oc-delete-invoice" data-id="${id}">Delete</button>`;
      row.appendChild(box);
    });
  }

  document.addEventListener('click', e => {
    const qEdit = e.target.closest('.oc-edit-quotation');
    const qDelete = e.target.closest('.oc-delete-quotation');
    const iEdit = e.target.closest('.oc-edit-invoice');
    const iDelete = e.target.closest('.oc-delete-invoice');

    if (qDelete) return deleteQuotation(qDelete.dataset.id);
    if (iDelete) return deleteInvoice(iDelete.dataset.id);

    if (qEdit) {
      // Prefer an existing edit route/modal if the application provides one.
      const id = qEdit.dataset.id;
      if (typeof window.openQuotationEditor === 'function') return window.openQuotationEditor(id);
      if (typeof window.editQuotation === 'function') return window.editQuotation(id);
      window.location.hash = '#quotation-edit-' + encodeURIComponent(id);
      document.dispatchEvent(new CustomEvent('oc:editQuotation', {detail:{id}}));
    }

    if (iEdit) {
      const id = iEdit.dataset.id;
      if (typeof window.openInvoiceEditor === 'function') return window.openInvoiceEditor(id);
      if (typeof window.editInvoice === 'function') return window.editInvoice(id);
      window.location.hash = '#invoice-edit-' + encodeURIComponent(id);
      document.dispatchEvent(new CustomEvent('oc:editInvoice', {detail:{id}}));
    }
  });

  new MutationObserver(addControls).observe(document.body, {childList:true, subtree:true});
  window.addEventListener('load', addControls);
  setTimeout(addControls, 800);
})();
