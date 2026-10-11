export default {
  nav: {
    title: 'PromptHub',
    promptsLink: 'Prompts',
    settingsLink: 'Ajustes',
    adminLink: 'Administración',
    logout: 'Cerrar sesión'
  },
  categoryList: {
    heading: 'Categorías',
    loading: 'Cargando...',
    allCategories: 'Todas las categorías',
    uncategorized: 'Sin categoría',
    edit: 'Editar',
    delete: 'Eliminar',
    noCategories: 'Aún no hay categorías.'
  },
  searchBar: {
    placeholder: 'Buscar prompts por título, contenido o etiquetas...'
  },
  promptCard: {
    copyTitle: 'Copiar prompt',
    editTitle: 'Editar',
    copiedToast: 'Prompt copiado al portapapeles',
    failedCopyToast: 'Error al copiar el prompt'
  },
  createPromptModal: {
    newTitle: 'Nuevo prompt',
    editTitle: 'Editar prompt',
    titleLabel: 'Título',
    titlePlaceholder: 'Título del prompt...',
    categoryLabel: 'Categoría',
    selectCategoryOption: 'Selecciona una categoría...',
    uncategorized: 'Sin categoría',
    contentLabel: 'Contenido',
    contentPlaceholder: 'Escribe tu prompt aquí...',
    tagsLabel: 'Etiquetas (separadas por comas)',
    tagsPlaceholder: 'ia, escritura, chatgpt',
    cancel: 'Cancelar',
    creating: 'Creando...',
    create: 'Crear prompt',
    update: 'Actualizar'
  },
  createCategoryModal: {
    newTitle: 'Nueva categoría',
    editTitle: 'Editar categoría',
    nameLabel: 'Nombre',
    namePlaceholder: 'Nombre de la categoría...',
    descriptionLabel: 'Descripción',
    descriptionPlaceholder: 'Descripción opcional...',
    cancel: 'Cancelar',
    saving: 'Guardando...',
    create: 'Crear categoría',
    update: 'Actualizar'
  },
  promptList: {
    heading: 'Prompts',
    newCategoryBtn: 'Nueva categoría',
    newPromptBtn: 'Nuevo prompt',
    exportBtn: 'Exportar',
    importBtn: 'Importar',
    exporting: 'Exportando...',
    exportEmpty: 'Aún no tienes prompts que exportar.',
    loading: 'Cargando prompts...',
    noPrompts: 'No se encontraron prompts.',
    filteredByTags: 'Filtrado por etiquetas',
    clearAllTags: 'Limpiar todas las etiquetas',
    loadMore: 'Cargar más'
  },
  importModal: {
    title: 'Importar prompts',
    fileNote: 'desde {file}',
    summary: '{new} nuevos · {exists} para sobrescribir · {skip} omitidos',
    newBadge: 'Nuevo',
    existsBadge: 'Existe',
    duplicateBadge: 'Duplicado',
    invalidBadge: 'Inválido',
    overwriteHint: 'Reemplazará tu versión actual',
    invalidTitleReason: 'El título es obligatorio (máx. 100 caracteres)',
    invalidContentReason: 'El contenido es obligatorio (máx. 50.000 caracteres)',
    invalidTagsReason: 'Demasiadas etiquetas (máx. 20)',
    invalidNote: '{count} entradas no son válidas y se omitirán.',
    quotaWarning:
      'Se excedería tu límite de prompts ({used}/{limit} en uso). Elimina algunos primero.',
    selectAll: 'Seleccionar todo',
    deselectAll: 'Deseleccionar todo',
    noneImportable: 'Ningún prompt de este archivo puede importarse.',
    cancel: 'Cancelar',
    import: 'Importar',
    importing: 'Importando...'
  },
  promptDetail: {
    backLink: 'Volver a prompts',
    copyBtn: 'Copiar',
    editBtn: 'Editar',
    deleteBtn: 'Eliminar',
    useBtn: 'Usar prompt',
    useTitle: 'Usar prompt',
    createdLabel: 'Creado:',
    updatedLabel: 'Actualizado:',
    notFound: 'Prompt no encontrado.'
  },
  categoryView: {
    backLink: 'Volver a prompts',
    editCategoryBtn: 'Editar categoría',
    deleteBtn: 'Eliminar',
    sectionHeading: 'Prompts en esta categoría',
    noPromptsInCat: 'Aún no hay prompts en esta categoría.'
  },
  settings: {
    heading: 'Ajustes',
    apiConfigTitle: 'Configuración de API',
    apiUrlLabel: 'URL base de la API',
    dataMgmtTitle: 'Gestión de datos',
    refreshBtn: 'Actualizar todos los datos',
    refreshingBtn: 'Actualizando...',
    aboutTitle: 'Acerca de',
    aboutText:
      'PromptHub v1.0.0 - Un sistema moderno de gestión de prompts construido con Vue 3, Express y MongoDB.'
  },
  common: {
    loading: 'Cargando...',
    successCopied: 'Prompt copiado al portapapeles',
    failedCopy: 'Error al copiar el prompt',
    requestFailed: 'Error en la solicitud',
    confirmDeleteTitle: 'Confirmar eliminación',
    confirmDeletePrompt: '¿Estás seguro de que quieres eliminar este prompt?',
    confirmDeleteCategory: '¿Eliminar esta categoría?',
    confirmDeactivateTitle: 'Confirmar desactivación',
    confirmDeactivateUser:
      '¿Seguro que quieres desactivar a este usuario? Sus datos se conservarán.',
    confirmDeactivateUserLabeled: '¿Desactivar a {label}? Sus datos se conservarán.',
    promptUpdated: '¡Prompt actualizado correctamente!',
    promptCreated: '¡Prompt creado correctamente!',
    categoryUpdated: '¡Categoría actualizada correctamente!',
    categoryCreated: '¡Categoría creada correctamente!',
    dataRefreshed: '¡Datos actualizados correctamente!',
    exportSuccess: 'Exportación descargada ({count} prompts).',
    importSuccess:
      'Importación completada: {created} creados, {updated} actualizados, {skipped} omitidos.',
    importFileError: 'No se pudo leer el archivo. ¿Es una exportación de PromptHub (.zip)?'
  },
  // Textos localizados para los códigos de error del servidor
  // (ver client/src/api/index.js). Las `{etiquetas}` se rellenan con los
  // parámetros del cuerpo del error.
  errors: {
    requestFailed: 'Error en la solicitud',
    networkError: 'Error de red. ¿La API es alcanzable?',
    invalidResponse:
      'Respuesta inesperada de la API. Vuelve a cargar la página; si persiste, la app puede estar mal configurada.',
    invalidToken: 'Tu sesión ha caducado. Inicia sesión de nuevo.',
    authRequired: 'Se requiere autenticación. Inicia sesión, por favor.',
    userInactive: 'Tu cuenta no está activa. Contacta con un administrador.',
    forbidden: 'No tienes permiso para realizar esta acción.',
    notOwner: 'Solo puedes modificar tus propios recursos.',
    invalidCredentials: 'Correo o contraseña no válidos.',
    accountDeactivated: 'Esta cuenta ha sido desactivada. Contacta con un administrador.',
    registrationDisabled: 'El registro está desactivado por el administrador en este momento.',
    emailTaken: 'Este correo ya está registrado.',
    wrongPassword: 'La contraseña actual no es correcta.',
    passwordTooShort: 'La nueva contraseña debe tener al menos 8 caracteres.',
    validationError: 'Algunos datos no son válidos. Revisa los campos e inténtalo de nuevo.',
    tagsTooMany: 'Se permiten un máximo de 20 etiquetas.',
    emailInvalid: 'Introduce una dirección de correo válida.',
    duplicate: 'Ese valor ya está en uso.',
    notFound: 'No se encontró el recurso solicitado.',
    limitReached: 'Has alcanzado el límite por usuario ({limit}).',
    rateLimited: 'Demasiadas solicitudes desde tu conexión. Inténtalo de nuevo más tarde.',
    selfModification: 'No puedes cambiar tu propio rol o estado.',
    importInvalid:
      'Ese archivo no se pudo importar. Revisa el archivo de exportación e inténtalo de nuevo.',
    importFileTooLarge: 'Ese archivo es demasiado grande (máx. {maxMb} MB).',
    internalError: 'Algo ha salido mal en nuestro lado. Inténtalo de nuevo.'
  },
  date: {
    created: 'Creado:',
    updated: 'Actualizado:'
  },
  auth: {
    loginTitle: 'Iniciar sesión',
    registerTitle: 'Crear cuenta',
    emailLabel: 'Correo electrónico',
    passwordLabel: 'Contraseña',
    confirmPasswordLabel: 'Confirmar contraseña',
    loginBtn: 'Iniciar sesión',
    registerBtn: 'Crear cuenta',
    loggingIn: 'Iniciando sesión...',
    registering: 'Creando cuenta...',
    noAccount: '¿No tienes cuenta?',
    hasAccount: '¿Ya tienes cuenta?',
    registerLink: 'Regístrate',
    loginLink: 'Inicia sesión',
    passwordMismatch: 'Las contraseñas no coinciden',
    nameLabel: 'Nombre'
  },
  admin: {
    usersHeading: 'Gestión de usuarios',
    active: 'Activo',
    deactivated: 'Desactivado',
    roleUser: 'Usuario',
    roleAdmin: 'Administrador',
    deactivate: 'Desactivar',
    activate: 'Activar',
    noUsers: 'No se encontraron usuarios.',
    roleUpdated: '¡Rol actualizado correctamente!',
    activated: 'Usuario activado.',
    deactivatedMsg: 'Usuario desactivado.',
    registrationTitle: 'Registro',
    registrationDesc: 'Permitir o impedir que nuevos usuarios creen cuentas.',
    registrationEnabled: 'Registro activado.',
    registrationDisabled: 'Registro desactivado.'
  },
  profile: {
    heading: 'Mi Perfil',
    viewProfile: 'Ver perfil',
    roleLabel: 'Rol',
    statusLabel: 'Estado',
    backLink: 'Volver al inicio',
    nameUpdated: '¡Nombre actualizado correctamente!',
    emailUpdated: '¡Correo actualizado correctamente!',
    clickToEdit: 'Haz clic para editar el nombre',
    clickToEditEmail: 'Haz clic para editar el correo',
    securityTitle: 'Seguridad',
    currentPassword: 'Contraseña actual',
    newPassword: 'Nueva contraseña',
    confirmPassword: 'Confirmar nueva contraseña',
    changePassword: 'Cambiar contraseña',
    passwordChanged: '¡Contraseña cambiada con éxito!',
    passwordMismatch: 'Las contraseñas no coinciden',
    passwordTooShort: 'La nueva contraseña debe tener al menos 8 caracteres',
    passwordFillAll: 'Completa todos los campos de contraseña'
  },
  theme: {
    lightMode: 'Modo Claro',
    darkMode: 'Modo Oscuro',
    autoMode: 'Automático'
  }
}
