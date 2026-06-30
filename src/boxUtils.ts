import { Box } from './box';

export function findMostRecentBox(boxes: Box[], targetBox: Box, targetTrackIndex: number, containerHeight: number): Box | undefined {
  let closestBox: Box | undefined;

  for (const box of boxes) {
    if (box.x > targetBox.x) {
      continue;
    }
    
    if (box.id == targetBox.id) {
      continue;
    }

    const boxCenterY = box.y + 25;
    const trackHeight = containerHeight > 0 ? containerHeight / 4 : 0;
    const trackIndex = containerHeight > 0 ? Math.min(Math.max(Math.floor(boxCenterY / trackHeight), 0), 3) : 0;

    if (trackIndex !== targetTrackIndex) {
      continue;
    }

    if (!closestBox || box.x > closestBox.x) {
      closestBox = box;
    }
  }

  return closestBox;
}
