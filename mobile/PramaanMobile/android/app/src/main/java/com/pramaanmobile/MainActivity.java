package com.pramaanmobile;
import android.app.Activity;
import android.os.Bundle;
import android.widget.TextView;
public class MainActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        TextView tv = new TextView(this);
        tv.setText("Pramaan App - Loading...");
        setContentView(tv);
    }
    @Override
    protected String getMainComponentName() {
        return "PramaanMobile";
    }
}