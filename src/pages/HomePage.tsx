import { Box } from '@mui/material';
import SimComponent from '../components/simComponent';
import ProjectMenu from '../components/ProjectMenu';
import styles from './HomePage.module.css';
import { useNBodyStore } from "../store/nBodyStore"


const HomePage = () => {
  // TODO: using this here causes zoomInSphere animation to stop working
  // const zoomedInBody = useNBodyStore((state) => state.zoomedInBody)
  
  // useEffect(() => {
  //   const nameContainer = document.querySelector(`.${styles.nameContainer}`)
  //   const titleContainer = document.querySelector(`.${styles.titleContainer}`)
    
  //   if (zoomedInBody) {
  //     nameContainer?.classList.add(styles.fadeOut)
  //     titleContainer?.classList.add(styles.fadeOut)
  //   } else {
  //     nameContainer?.classList.remove(styles.fadeOut)
  //     titleContainer?.classList.remove(styles.fadeOut)
  //   }
  // }, [zoomedInBody])
  
  return (
    <Box sx={{ flexGrow: 1, height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Main Content */}
      <Box sx={{ display: "flex", flexGrow: 1, overflow: "hidden" }}>
        {/* Canvas/Main Content Area */}
        <Box sx={{ flex: 1 }}>
          <SimComponent />
        </Box>

        {/* Render the ProjectMenu (no visible output until a body is zoomed in) */}
        <ProjectMenu />
      </Box>
      {/* Textbox in the top right corner */}
      <Box sx={{ position: "absolute", top: 0, left: 0, color: "white", padding: 1 }}>
        <div className={styles.titleContainer}>
          <div className={styles.first}>Projects</div>
          <div className={styles.second} id="name-display"></div>
        </div>
      </Box>
            {/* Textbox in the top right corner */}
      <Box sx={{ position: "absolute", top: 0, right: 0, color: "white", padding: 1 }}>
        <div className={styles.nameContainer}>
          <div className={styles.first}>John</div>
          <div className={styles.second}>Peng</div>
        </div>
      </Box>

    </Box>
  );
};

export default HomePage;
