import { Box } from '@mui/material';
import SimComponent from '../components/simComponent';
const HomePage = () => {
  return (
    <Box sx={{ flexGrow: 1, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Nav Section */}
      <Box 
        sx={{ 
          height: '64px', 
          bgcolor: '#2196f3',
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
        {/* Side Menu */}
        <Box 
          sx={{ 
            width: '240px',
            bgcolor: '#4caf50',
            flexShrink: 0,
            height: '100%'
          }}
        >
          Side Menu
        </Box>

        {/* Canvas/Main Content Area */}
        <Box 
          sx={{ 
            flexGrow: 1,
            bgcolor: '#ff9800',
            p: 3,
            height: '100%',
            overflow: 'auto'
          }}
        >
          <SimComponent />
        </Box>
      </Box>
    </Box>
  );
};

export default HomePage;