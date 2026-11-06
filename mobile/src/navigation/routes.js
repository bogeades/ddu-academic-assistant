export const getHomeRouteForRole = (role) => {
  switch (role) {
    case 'admin':
      return 'AdminPortal';
    case 'registrar':
      return 'RegistrarPortal';
    case 'lecturer':
      return 'LecturerPortal';
    case 'deptHead':
      return 'DeptHeadPortal';
    default:
      return 'StudentHome';
  }
};
