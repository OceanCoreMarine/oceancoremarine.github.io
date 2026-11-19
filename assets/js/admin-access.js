/* UI permissions; PostgreSQL remains authoritative. */
(()=>{'use strict';
const labels={products:'Products & Catalogue Import',categories:'Categories & Subcategories',brands:'Brands',reviews:'Product Reviews',enquiries:'Enquiries & Follow-up',billing:'Customers, Quotations, Invoices & Delivery',gallery:'Gallery, Datasheets & Availability',inventory:'Stock & Suppliers',bulk_edit:'Bulk Product Edit',content:'Website Content',reports:'Website Reports'};
const legacy={sales:['enquiries','billing','reports'],product_editor:['products','categories','brands','reviews','gallery','inventory','bulk_edit']};
const permissions=a=>a?.role==='admin'?Object.keys(labels):a?.role==='custom'?(a.permissions||[]):(legacy[a?.role]||[]);
window.OceanCoreAccess={labels,permissions,can:key=>window.ocAdminAccess?.enabled!==false&&(window.ocAdminAccess?.role==='admin'||permissions(window.ocAdminAccess).includes(key))};
})();
