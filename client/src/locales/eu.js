export default {
  nav: {
    title: 'PromptHub',
    promptsLink: 'Promptak',
    settingsLink: 'Ezarpenak',
    adminLink: 'Administrazioa',
    logout: 'Amaitu saioa'
  },
  categoryList: {
    heading: 'Kategoriak',
    loading: 'Kargatzen...',
    allCategories: 'Kategoria guztiak',
    uncategorized: 'Kategoriarik gabe',
    edit: 'Editatu',
    delete: 'Ezabatu',
    noCategories: 'Oraindik ez dago kategoriarik.'
  },
  searchBar: {
    placeholder: 'Bilatu promptak izenburu, eduki edo etiketen arabera...'
  },
  promptCard: {
    copyTitle: 'Kopiatu prompta',
    editTitle: 'Editatu',
    copiedToast: 'Prompta arbelera kopiatuta!',
    failedCopyToast: 'Ezin izan da prompta kopiatu'
  },
  createPromptModal: {
    newTitle: 'Prompt berria',
    editTitle: 'Editatu prompta',
    titleLabel: 'Izenburua',
    titlePlaceholder: 'Prompten izenburua...',
    categoryLabel: 'Kategoria',
    selectCategoryOption: 'Hautatu kategoria bat...',
    uncategorized: 'Kategoriarik gabe',
    contentLabel: 'Edukia',
    contentPlaceholder: 'Idatzi zure prompta hemen...',
    tagsLabel: 'Etiketak (koma bereiztu)',
    tagsPlaceholder: 'ia, idazteko, chatgpt',
    cancel: 'Utzi',
    creating: 'Sortzen...',
    create: 'Sortu prompta',
    update: 'Eguneratu'
  },
  createCategoryModal: {
    newTitle: 'Kategoria berria',
    editTitle: 'Editatu kategoria',
    nameLabel: 'Izena',
    namePlaceholder: 'Kategoriaren izena...',
    descriptionLabel: 'Deskribapena',
    descriptionPlaceholder: 'Aukerazko deskribapena...',
    cancel: 'Utzi',
    saving: 'Gordetzen...',
    create: 'Sortu kategoria',
    update: 'Eguneratu'
  },
  promptList: {
    heading: 'Promptak',
    newCategoryBtn: 'Kategoria berria',
    newPromptBtn: 'Prompt berria',
    exportBtn: 'Esportatu',
    importBtn: 'Inportatu',
    exporting: 'Esportatzen...',
    exportEmpty: 'Ez duzu promptik esportatzeko oraindik.',
    loading: 'Promptak kargatzen...',
    noPrompts: 'Ez da prompterik aurkitu.',
    filteredByTags: 'Etiketen arabera iragazitakoak',
    clearAllTags: 'Garbi etiketa guztiak',
    loadMore: 'Kargatu gehiago'
  },
  importModal: {
    title: 'Inportatu promptak',
    fileNote: '{file} fitxategitik',
    summary: '{new} berriak · {exists} gainidatzeko · {skip} saltoatuak',
    newBadge: 'Berria',
    existsBadge: 'Badago',
    duplicateBadge: 'Bikoitia',
    invalidBadge: 'Baliogabea',
    overwriteHint: 'Ordezkatuko du zure uneko bertsioa',
    invalidTitleReason: 'Izenburua beharrezkoa da (gehienak 100 karaktere)',
    invalidContentReason: 'Edukia beharrezkoa da (gehienak 50.000 karaktere)',
    invalidTagsReason: 'Etiketa gehiegi (gehienak 20)',
    invalidNote: '{count} sarrera baliogabeak dira eta saltatuko dira.',
    quotaWarning:
      'Zure prompt mugak gaindituko litzateke ({used}/{limit} erabiltzen). Ezabatu zenbait prompt lehenik.',
    selectAll: 'Hautatu guztiak',
    deselectAll: 'Deskonektatu guztiak',
    noneImportable: 'Ezin da fitxategi honetako promptik inportatu.',
    cancel: 'Utzi',
    import: 'Inportatu',
    importing: 'Inportatzen...'
  },
  promptDetail: {
    backLink: 'Itzuli promptetara',
    copyBtn: 'Kopiatu',
    editBtn: 'Editatu',
    deleteBtn: 'Ezabatu',
    useBtn: 'Erabili prompta',
    useTitle: 'Erabili prompta',
    createdLabel: 'Sortua:',
    updatedLabel: 'Eguneratua:',
    notFound: 'Ez da prompterik aurkitu.'
  },
  categoryView: {
    backLink: 'Itzuli promptetara',
    editCategoryBtn: 'Editatu kategoria',
    deleteBtn: 'Ezabatu',
    sectionHeading: 'Kategoria honetako promptak',
    noPromptsInCat: 'Ez dago prompterik kategoria honetan oraindik.'
  },
  settings: {
    heading: 'Ezarpenak',
    apiConfigTitle: 'API konfigurazioa',
    apiUrlLabel: 'API oinarriko URLa',
    dataMgmtTitle: 'Datuen kudeaketa',
    refreshBtn: 'Freskatu datu guztiak',
    refreshingBtn: 'Freskatzen...',
    aboutTitle: 'Honi buruz',
    aboutText:
      'PromptHub v1.0.0 - Vue 3, Express eta MongoDB erabiliz eraikitako prompt kudeaketa sistema modernoa.'
  },
  common: {
    loading: 'Kargatzen...',
    successCopied: 'Prompta arbelera kopiatuta!',
    failedCopy: 'Ezin izan da prompta kopiatu',
    requestFailed: 'Eskaerak huts egin du',
    confirmDeleteTitle: 'Berretsi ezabaketa',
    confirmDeletePrompt: 'Ziur prompta ezabatu nahi duzu?',
    confirmDeleteCategory: 'Kategoria hau ezabatu?',
    confirmDeactivateTitle: 'Berretsi desaktibazioa',
    confirmDeactivateUser:
      'Ziur zenuen erabiltzailea hau desgaitu nahi duzun? Bere datuak gorde egingo dira.',
    confirmDeactivateUserLabeled: '{label} desgaitu? Bere datuak gorde egingo dira.',
    promptUpdated: 'Prompta arrakastaz eguneratuta!',
    promptCreated: 'Prompta arrakastaz sortuta!',
    categoryUpdated: 'Kategoria arrakastaz eguneratuta!',
    categoryCreated: 'Kategoria arrakastaz sortuta!',
    dataRefreshed: 'Datuak arrakastaz freskatu dira!',
    exportSuccess: 'Esportazioa deskargatuta ({count} prompt).',
    importSuccess:
      'Inportazioa amaituta: {created} sortuta, {updated} eguneratuta, {skipped} saltatu.',
    importFileError: 'Ezin izan da fitxategia irakurri. PromptHub esportazio bat al da (.zip)?'
  },
  // Zerbitzariak itzultzen duen erroen kodeetarako lokalizatuak testuak
  // (ikusi client/src/api/index.js). `{token}` leihauak erroaren
  // gorputzeko parametrekin betetzen dira.
  errors: {
    requestFailed: 'Eskaerak huts egin du',
    networkError: 'Sare-errorea. APIa iristen al da?',
    invalidResponse:
      'Erantzun espero gabea APIak. Kargatu orria berriro; iragaiten bada, aplikazioa gaizki konfiguratuta egon daiteke.',
    invalidToken: 'Zure saioa amaitu da. Hasieratu saioa berriro, mesedez.',
    authRequired: 'Autentifikazioa behar da. Hasieratu saioa, mesedez.',
    userInactive: 'Zure kontua ez dago aktiboan. Jarri harreman administratzaile batekin.',
    forbidden: 'Ez duzu baimenik ekintza hau egiteko.',
    notOwner: 'Zure baliabide propioak soilik alda ditzakezu.',
    invalidCredentials: 'Helbide elektroniko edo pasahitz baliogabea.',
    accountDeactivated: 'Kontu hau desgaituta dago. Jarri harreman administratzaile batekin.',
    accountLocked: 'Hainbat saio huts egin duzu: kontua behin-behinean blokeatuta dago. Saiatu berriz 15 minutu barru.',
    registrationDisabled: 'Erregistroa desaktibatuta dago une honetan administratzaileak.',
    emailTaken: 'Helbide elektroniko hori dagoeneko erregistratuta dago.',
    wrongPassword: 'Uneko pasahitza ez da zuzena.',
    passwordTooShort: 'Pasahitu berriak gutxienez 8 karaktere izan behar ditu.',
    validationError: 'Zure datu batzuk baliogabeak dira. Egiaztatu eremuak eta saiatu berriro.',
    tagsTooMany: 'Gehienez 20 etiketa onartzen dira.',
    emailInvalid: 'Sartu baliozko helbide elektroniko bat.',
    duplicate: 'Balio hori dagoeneko erabileran dago.',
    notFound: 'Ez da eskatutako baliabidea aurkitu.',
    limitReached: 'Erabiltzaileko muga gainditu duzu ({limit}).',
    rateLimited: 'Eskaera gehiegi zure konexiotik. Saiatu berriro geroago.',
    selfModification: 'Ezin duzu zure buruaren rola edo egoera aldatu.',
    importInvalid:
      'Ezin izan da fitxategi hori inportatu. Egiaztatu esportazio-fitxategia eta saiatu berriro.',
    importFileTooLarge: 'Fitxategi hori handiegia da (gehienez {maxMb} MB).',
    internalError: 'Zerbait gaizki jo da gure aldean. Saiatu berriro.'
  },
  date: {
    created: 'Sortua:',
    updated: 'Eguneratua:'
  },
  auth: {
    loginTitle: 'Hasi saioa',
    registerTitle: 'Sortu kontua',
    emailLabel: 'Helbide elektronikoa',
    passwordLabel: 'Pasahitza',
    confirmPasswordLabel: 'Berretsi pasahitza',
    loginBtn: 'Hasi saioa',
    registerBtn: 'Sortu kontua',
    loggingIn: 'Saioa hasten...',
    registering: 'Kontua sortzen...',
    noAccount: 'Ez duzu konturik?',
    hasAccount: 'Jada baduzu kontu bat?',
    registerLink: 'Erregistratu',
    loginLink: 'Hasi saioa',
    passwordMismatch: 'Pasahitzak ez datoz bat',
    nameLabel: 'Izena'
  },
  admin: {
    usersHeading: 'Erabiltzaileen kudeaketa',
    active: 'Aktibo',
    deactivated: 'Desaktibatuta',
    roleUser: 'Erabiltzaile',
    roleAdmin: 'Administratzaile',
    deactivate: 'Desaktibatu',
    activate: 'Aktibatu',
    noUsers: 'Ez da erabiltzailerik aurkitu.',
    roleUpdated: 'Rola arrakastaz eguneratuta!',
    activated: 'Erabiltzailea aktibatuta.',
    deactivatedMsg: 'Erabiltzailea desaktibatuta.',
    registrationTitle: 'Erregistroa',
    registrationDesc: 'Baimendu edo eragoz berri erabiltzaileek kontuak sortzea.',
    registrationEnabled: 'Erregistroa aktibatuta.',
    registrationDisabled: 'Erregistroa desaktibatuta.'
  },
  profile: {
    heading: 'Nire Profila',
    viewProfile: 'Profila ikusi',
    roleLabel: 'Rola',
    statusLabel: 'Egoera',
    backLink: 'Itzuli hasierara',
    nameUpdated: 'Izena arrakastaz eguneratuta!',
    emailUpdated: 'Emaila arrakastaz eguneratuta!',
    clickToEdit: 'Egin klik izena editatzeko',
    clickToEditEmail: 'Egin klik emaila editatzeko',
    securityTitle: 'Segurtasuna',
    currentPassword: 'Uneko pasahitza',
    newPassword: 'Pasahitu berria',
    confirmPassword: 'Berrestatu pasahitu berria',
    changePassword: 'Aldatu pasahitza',
    passwordChanged: 'Pasahitza arrakastaz aldatua!',
    passwordMismatch: 'Pasahitzek ez dute bat egiten',
    passwordTooShort: 'Pasahitu berriak gutxienez 8 karaktere izan behar ditu',
    passwordFillAll: 'Bete pasahitzaren eremu guztiak'
  },
  theme: {
    lightMode: 'Argi Modua',
    darkMode: 'Ilun Modua',
    autoMode: 'Automatikoa'
  }
}
