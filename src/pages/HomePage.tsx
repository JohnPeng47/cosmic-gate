import { Box } from '@mui/material';
import SimComponent from '../components/simComponent';
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
      <Box sx={{ 
        display: 'flex', 
        flexGrow: 1,
        overflow: 'hidden'
      }}>
        {/* Canvas/Main Content Area */}
        <Box >
          <SimComponent />
        </Box>
      </Box>
    </Box>
  );
};

export default HomePage;