import android.media.MediaPlayer;
import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;

public class SleepSoundsActivity extends AppCompatActivity {

    private MediaPlayer mediaPlayer;
    
    // Sound resource map
    private int[] soundResources = { 
        R.raw.sound1, // Replace with your actual sound resources
        R.raw.sound2,
        R.raw.sound3
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_sleep_sounds);
    }

    public void playSound(int soundIndex) {
        if (mediaPlayer != null) {
            mediaPlayer.release();
        }
        mediaPlayer = MediaPlayer.create(this, soundResources[soundIndex]);
        mediaPlayer.start();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (mediaPlayer != null) {
            mediaPlayer.release();
            mediaPlayer = null;
        }
    }
}