import SongPickerModal from '../../../components/SongPickerModal';
import { getSong } from '../../../data/songs';
import { showToast } from '../../../utils/toast';

export default function AddSongsModal({ visible, onClose, songIds, onAdd }: {
  visible: boolean; onClose: () => void; songIds: string[]; onAdd: (id: string) => void;
}) {
  return <SongPickerModal visible={visible} onClose={onClose} songIds={songIds} onAdd={id => {
    onAdd(id);
    showToast('success', 'Song added to playlist', getSong(id)?.title);
  }} />;
}
