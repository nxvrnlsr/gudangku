/**
 * Backend Locale — English
 * All messages the API returns to the client.
 */
module.exports = {
  // ── Common ──────────────────────────────────────
  serverError:   'An internal server error occurred.',
  notFound:      'Document not found.',
  forbidden:     'Access denied.',
  unauthorized:  'Access denied. Token not found.',
  tokenInvalid:  'Invalid or expired token. Please log in again.',
  tokenExpired:  'Your session has expired. Please log in again.',
  routeNotFound: 'Route not found.',

  // ── Auth ────────────────────────────────────────
  auth: {
    emailPasswordRequired: 'Email and password are required.',
    invalidCredentials:    'Invalid email or password.',
    accountInactive:       'Your account is inactive. Please contact the administrator.',
    passwordRequired:      'Current and new password are required.',
    passwordMinLength:     'New password must be at least 8 characters.',
    currentPasswordWrong:  'Current password is incorrect.',
    passwordChanged:       'Password changed successfully.',
    loginSuccess:          'Login successful.',
  },

  // ── Users ───────────────────────────────────────
  users: {
    loadError:    'Failed to load users.',
    rolesError:   'Failed to load roles.',
    nameEmailPasswordRequired: 'Name, email, and password are required.',
    passwordMinLength: 'Password must be at least 8 characters.',
    emailTaken:   'This email address is already in use.',
    created:      'User created successfully.',
    createError:  'Failed to create user.',
    updated:      'User updated successfully.',
    updateError:  'Failed to update user.',
    passwordMinLengthReset: 'Password must be at least 8 characters.',
    passwordReset: 'Password reset successfully.',
    resetError:   'Failed to reset password.',
  },

  // ── Warehouses ──────────────────────────────────
  warehouses: {
    notFound:     'Warehouse not found.',
    serverError:  'Failed to load warehouse data.',
  },

  // ── Items ───────────────────────────────────────
  items: {
    notFound:     'Item not found.',
    skuTaken:     'SKU is already in use by another item.',
    created:      'Item created successfully.',
    createError:  'Failed to create item.',
    updated:      'Item updated successfully.',
    updateError:  'Failed to update item.',
    deleted:      'Item deleted successfully.',
    deleteError:  'Failed to delete item.',
    serverError:  'Failed to load item data.',
  },

  // ── Receipts ────────────────────────────────────
  receipts: {
    notFound:         'Receipt document not found.',
    warehouseRequired:'Warehouse, supplier, and at least one line item are required.',
    alreadyConfirmed: 'This document has already been confirmed.',
    alreadyCancelled: 'This document has already been cancelled.',
    created:          'Receipt created successfully.',
    createError:      'Failed to create receipt.',
    confirmed:        'Receipt confirmed. Stock has been updated.',
    confirmError:     'Failed to confirm receipt.',
    cancelled:        'Receipt cancelled.',
    cancelError:      'Failed to cancel receipt.',
    serverError:      'Failed to load receipt data.',
  },

  // ── Issues ──────────────────────────────────────
  issues: {
    notFound:           'Issue document not found.',
    warehouseRequired:  'Warehouse and at least one line item are required.',
    alreadyConfirmed:   'This document has already been confirmed.',
    alreadyCancelled:   'This document has already been cancelled.',
    insufficientStock:  'Insufficient stock for one or more items.',
    created:            'Issue document created successfully.',
    createError:        'Failed to create issue document.',
    confirmed:          'Issue confirmed. Stock has been deducted.',
    confirmError:       'Failed to confirm issue.',
    cancelled:          'Issue cancelled.',
    cancelError:        'Failed to cancel issue.',
    serverError:        'Failed to load issue data.',
  },

  // ── Transfers ───────────────────────────────────
  transfers: {
    notFound:          'Transfer document not found.',
    warehouseRequired: 'Source warehouse, destination warehouse, and at least one line item are required.',
    sameWarehouse:     'Source and destination warehouses cannot be the same.',
    invalidStatusDispatch: (status) => `Cannot dispatch a transfer with status '${status}'.`,
    invalidStatusReceive:  (status) => `Transfer must be 'in_transit' to receive. Current status: '${status}'.`,
    created:           (docNum) => `Transfer ${docNum} created successfully.`,
    createError:       'Failed to create transfer.',
    dispatched:        (docNum) => `Transfer ${docNum} dispatched. Source stock reduced.`,
    dispatchError:     'Failed to dispatch transfer.',
    received:          (docNum) => `Transfer ${docNum} received. Destination stock updated.`,
    receiveError:      'Failed to receive transfer.',
    serverError:       'Failed to load transfer data.',
  },

  // ── Reports ─────────────────────────────────────
  reports: {
    itemWarehouseRequired: 'item_id and warehouse_id are required.',
    exportPathRequired:    'export_path is required.',
    fileSaved:             'File saved successfully.',
    pathUpdated:           (path) => `Export path updated to: ${path}`,
    folderNotFound:        (path) => `Folder not found: ${path}`,
    folderOpened:          'Folder opened in Windows Explorer.',
    serverError:           'Failed to load report data.',
  },

  // ── Batches ─────────────────────────────────────
  batches: {
    notFound:    'Batch not found.',
    updated:     'Batch status updated.',
    updateError: 'Failed to update batch.',
    serverError: 'Failed to load batch data.',
  },
};
