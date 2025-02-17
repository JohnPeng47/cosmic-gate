import { Box } from '@mui/material';
import SimComponent from '../components/simComponent';
import ProjectMenu from '../components/ProjectMenu';

const HomePage = () => {
  return (
    <Box sx={{ flexGrow: 1, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Nav Section */}
      <Box 
        sx={{ 
          height: '64px', 
          bgcolor: '#ffffff',
          width: '100%'
        }}
      >
        Nav
      </Box>

      {/* Main Content */}
      <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        {/* Canvas/Main Content Area */}
        <Box sx={{ flex: 1 }}>
          <SimComponent />
        </Box>

        {/* Render the ProjectMenu (no visible output until a body is zoomed in) */}
        <ProjectMenu />
      </Box>
    </Box>
  );
};



export default HomePage;
