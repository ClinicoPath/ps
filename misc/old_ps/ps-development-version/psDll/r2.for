	DOUBLE PRECISION FUNCTION R2(X)
	IMPLICIT NONE
	DOUBLE PRECISION X,P(0:7),Q(0:7),NUMER,DENOM
        INTEGER J
	DATA P/3.0045 9261 0201 6160 05D2,
     .         4.5191 8953 7118 7294 22D2,
     .         3.3932 0816 7343 4368 70D2,
     .         1.5298 9285 0469 4040 39D2,
     .         4.3162 2272 2205 6735 30D1,
     .         7.2117 5825 0883 0936 59D0,
     .         5.6419 5517 4789 7397 11D-1,
     .        -1.3686 4857 3827 1670 67D-7/
	DATA Q/3.0045 9260 9569 8329 33D2,
     .         7.9095 0925 3278 9802 72D2,
     .         9.3135 4094 8506 0962 11D2,
     .         6.3898 0264 4656 3116 65D2,
     .         2.7758 5444 7439 8764 34D2,
     .         7.7000 1529 3522 9472 95D1,
     .         1.2782 7273 1962 9423 51D1,
     .         1.0000 0000 0000 0000 0000D0/
      NUMER = 0
      DENOM = 0
	DO 10 J=0,7
	    NUMER=NUMER+P(J)*X**J
          DENOM=DENOM +Q(J)*X**J
10	CONTINUE
      R2= NUMER/DENOM
	RETURN
	END